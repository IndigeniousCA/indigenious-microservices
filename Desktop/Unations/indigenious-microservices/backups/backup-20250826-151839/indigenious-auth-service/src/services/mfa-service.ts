/**
 * Multi-Factor Authentication Service
 * Handles TOTP-based 2FA with backup codes
 */

import speakeasy from 'speakeasy'
import { logger } from '@/lib/monitoring/logger';
import QRCode from 'qrcode'
import { randomBytes } from 'crypto'
import prisma from '../prisma'
import { hash, compare } from 'bcryptjs'

export interface MFASetupResult {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export interface MFAVerificationResult {
  valid: boolean
  error?: string
}

export class MFAService {
  private readonly APP_NAME = 'Indigenous Procurement Platform'
  private readonly BACKUP_CODE_COUNT = 10
  private readonly BACKUP_CODE_LENGTH = 8
  private readonly TOKEN_WINDOW = 2 // Accept tokens 2 windows before/after

  /**
   * Enable MFA for a user
   */
  async enableMFA(userId: string): Promise<MFASetupResult> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled for this user')
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${user.email})`,
      issuer: this.APP_NAME,
      length: 32,
    })

    // Generate QR code
    const qrCodeUrl = await this.generateQRCode(secret.otpauth_url!)

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes()
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hash(code, 10))
    )

    // Store encrypted secret and hashed backup codes (temporarily)
    // Note: In production, encrypt the secret before storing
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret.base32, // Should be encrypted in production
        mfaBackupCodes: hashedBackupCodes,
      },
    })

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    }
  }

  /**
   * Verify MFA setup with initial code
   */
  async verifyMFASetup(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.mfaSecret) {
      throw new Error('MFA setup not found')
    }

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: this.TOKEN_WINDOW,
    })

    if (isValid) {
      // Enable MFA
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      })

      // Log the activation
      await this.logMFAEvent(userId, 'MFA_ENABLED')
    }

    return isValid
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFAToken(userId: string, token: string): Promise<MFAVerificationResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return { valid: false, error: 'MFA not enabled for this user' }
    }

    // First, try to verify as TOTP token
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: this.TOKEN_WINDOW,
    })

    if (isValidTOTP) {
      await this.logMFAEvent(userId, 'MFA_VERIFIED')
      return { valid: true }
    }

    // If TOTP fails, check if it's a backup code
    const isValidBackup = await this.verifyBackupCode(userId, token)
    if (isValidBackup) {
      await this.logMFAEvent(userId, 'BACKUP_CODE_USED')
      return { valid: true }
    }

    await this.logMFAEvent(userId, 'MFA_FAILED')
    return { valid: false, error: 'Invalid authentication code' }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify password
    if (!user.password || !(await compare(password, user.password))) {
      throw new Error('Invalid password')
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    })

    await this.logMFAEvent(userId, 'MFA_DISABLED')
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.mfaEnabled) {
      throw new Error('MFA not enabled for this user')
    }

    // Generate new backup codes
    const backupCodes = await this.generateBackupCodes()
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hash(code, 10))
    )

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    })

    await this.logMFAEvent(userId, 'BACKUP_CODES_REGENERATED')

    return backupCodes
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    })

    return user?.mfaEnabled || false
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean
    backupCodesRemaining: number
    lastUsed?: Date
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaBackupCodes: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get last MFA usage from audit logs
    const lastMFALog = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: { in: ['MFA_VERIFIED', 'BACKUP_CODE_USED'] },
      },
      orderBy: { timestamp: 'desc' },
    })

    return {
      enabled: user.mfaEnabled,
      backupCodesRemaining: user.mfaBackupCodes.length,
      lastUsed: lastMFALog?.timestamp,
    }
  }

  /**
   * Generate QR code for TOTP setup
   */
  private async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 256,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      })
    } catch (error) {
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * Generate backup codes
   */
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = []

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(this.BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase()
      codes.push(code)
    }

    return codes
  }

  /**
   * Verify and consume a backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaBackupCodes: true },
    })

    if (!user || user.mfaBackupCodes.length === 0) {
      return false
    }

    // Check each hashed backup code
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const isMatch = await compare(code, user.mfaBackupCodes[i])
      
      if (isMatch) {
        // Remove used backup code
        const newBackupCodes = user.mfaBackupCodes.filter((_, index) => index !== i)
        
        await prisma.user.update({
          where: { id: userId },
          data: { mfaBackupCodes: newBackupCodes },
        })

        return true
      }
    }

    return false
  }

  /**
   * Log MFA events for audit trail
   */
  private async logMFAEvent(userId: string, action: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: 'mfa',
        details: {
          timestamp: new Date().toISOString(),
        },
      },
    })
  }

  /**
   * Send MFA code via SMS (alternative to TOTP)
   */
  async sendMFACodeViaSMS(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerified: true },
    })

    if (!user?.phone || !user.phoneVerified) {
      throw new Error('Phone number not verified')
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code in Redis with 5-minute expiry
    const redisKey = `mfa:sms:${userId}`
    const { redis } = await import('../cache/redis')
    
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    await redis.setex(
      redisKey,
      300, // 5 minutes in seconds
      JSON.stringify({
        code,
        attempts: 0,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      })
    )

    // Send SMS
    const { smsService } = await import('../sms')
    await smsService.send({
      to: user.phone,
      message: `Your Indigenous Procurement Platform verification code is: ${code}. This code expires in 5 minutes.`,
    })

    await this.logMFAEvent(userId, 'MFA_SMS_SENT')
  }

  /**
   * Verify SMS MFA code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    try {
      const { redis } = await import('../cache/redis')
      const redisKey = `mfa:sms:${userId}`
      
      // Get stored code from Redis
      const storedData = await redis.get(redisKey)
      
      if (!storedData) {
        await this.logMFAEvent(userId, 'MFA_SMS_EXPIRED')
        return false
      }
      
      // Parse stored data
      const { code: storedCode, attempts = 0, expiresAt } = JSON.parse(storedData)
      
      // Check if expired
      if (new Date() > new Date(expiresAt)) {
        await redis.del(redisKey)
        await this.logMFAEvent(userId, 'MFA_SMS_EXPIRED')
        return false
      }
      
      // Check attempts limit (max 3)
      if (attempts >= 3) {
        await redis.del(redisKey)
        await this.logMFAEvent(userId, 'MFA_SMS_MAX_ATTEMPTS')
        return false
      }
      
      // Verify code
      if (code === storedCode) {
        // Success - delete the code
        await redis.del(redisKey)
        await this.logMFAEvent(userId, 'MFA_SMS_VERIFIED')
        return true
      } else {
        // Failed attempt - increment counter
        await redis.setex(
          redisKey,
          300, // Keep original 5-minute expiry
          JSON.stringify({
            code: storedCode,
            attempts: attempts + 1,
            expiresAt
          })
        )
        
        await this.logMFAEvent(userId, 'MFA_SMS_FAILED')
        return false
      }
    } catch (error) {
      logger.error('SMS code verification error:', error)
      await this.logMFAEvent(userId, 'MFA_SMS_ERROR')
      return false
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService()