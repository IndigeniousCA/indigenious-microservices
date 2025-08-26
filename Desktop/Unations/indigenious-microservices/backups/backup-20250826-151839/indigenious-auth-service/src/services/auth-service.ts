/**
 * Authentication Service
 * Comprehensive auth with MFA, refresh tokens, and session management
 */

import { compare, hash } from 'bcryptjs'
import { logger } from '@/lib/monitoring/logger';
import { randomBytes } from 'crypto'
import prisma from '../prisma'
import { tokenService } from './token-service'
import { mfaService } from './mfa-service'
import { emailService } from '../email'
import { smsService } from '../sms'
import { auditService } from '../audit'
import { EmailTemplate } from '../email/types'
import { User, UserStatus } from '@prisma/client'

export interface LoginResult {
  success: boolean
  requiresMFA?: boolean
  user?: Partial<User>
  tokens?: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
  error?: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  acceptedTerms: boolean
}

export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes
  private readonly PASSWORD_MIN_LENGTH = 8
  private readonly PASSWORD_RESET_EXPIRES = 60 * 60 * 1000 // 1 hour
  private readonly EMAIL_VERIFICATION_EXPIRES = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{
    success: boolean
    user?: Partial<User>
    error?: string
  }> {
    try {
      // Validate input
      if (!this.isValidEmail(data.email)) {
        return { success: false, error: 'Invalid email address' }
      }

      if (!this.isStrongPassword(data.password)) {
        return {
          success: false,
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        }
      }

      if (!data.acceptedTerms) {
        return { success: false, error: 'You must accept the terms and conditions' }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      })

      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' }
      }

      // Hash password
      const hashedPassword = await hash(data.password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          status: 'PENDING', // Requires email verification
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      })

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex')
      const verificationExpires = new Date(Date.now() + this.EMAIL_VERIFICATION_EXPIRES)

      // Store verification token in Redis with expiration
      const redisKey = `email_verification:${verificationToken}`;
      const redis = await import('../cache/redis').then(m => m.redis);
      await redis.setex(redisKey, this.EMAIL_VERIFICATION_EXPIRES / 1000, JSON.stringify({
        userId: user.id,
        email: user.email,
        token: verificationToken,
        expiresAt: verificationExpires.toISOString()
      }));

      // Send verification email
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`
      await emailService.sendVerificationEmail(user.email, verificationUrl)

      // Log registration
      await auditService.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: 'auth',
        details: { email: user.email },
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }
    } catch (error) {
      logger.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (!user) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Check account status
      if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
        return { success: false, error: 'Your account has been suspended' }
      }

      if (user.status === 'PENDING') {
        return { success: false, error: 'Please verify your email address' }
      }

      // Check password
      if (!user.password || !(await compare(password, user.password))) {
        // Increment failed login attempts
        await this.handleFailedLogin(user.id, ipAddress)
        return { success: false, error: 'Invalid email or password' }
      }

      // Check if account is locked
      const isLocked = await this.isAccountLocked(user.id)
      if (isLocked) {
        return { success: false, error: 'Account is temporarily locked due to too many failed attempts' }
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Create temporary session for MFA
        const mfaToken = tokenService.createTemporaryToken(
          { userId: user.id, purpose: 'mfa' },
          '5m'
        )

        return {
          success: true,
          requiresMFA: true,
          user: {
            id: user.id,
            email: user.email,
          },
        }
      }

      // Generate tokens
      const tokens = await tokenService.generateTokenPair(user)

      // Update user login info
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginCount: { increment: 1 },
        },
      })

      // Log successful login
      await auditService.log({
        userId: user.id,
        action: 'USER_LOGIN',
        resource: 'auth',
        ipAddress,
        details: { method: 'password' },
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      }
    } catch (error) {
      logger.error('Login error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  /**
   * Complete MFA login
   */
  async completeMFALogin(userId: string, mfaCode: string, ipAddress?: string): Promise<LoginResult> {
    try {
      // Verify MFA code
      const result = await mfaService.verifyMFAToken(userId, mfaCode)

      if (!result.valid) {
        return { success: false, error: result.error || 'Invalid authentication code' }
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user || user.status !== 'ACTIVE') {
        return { success: false, error: 'Invalid user' }
      }

      // Generate tokens
      const tokens = await tokenService.generateTokenPair(user)

      // Update login info
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginCount: { increment: 1 },
        },
      })

      // Log successful login
      await auditService.log({
        userId: user.id,
        action: 'USER_LOGIN',
        resource: 'auth',
        ipAddress,
        details: { method: 'mfa' },
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      }
    } catch (error) {
      logger.error('MFA login error:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      // Revoke refresh token
      if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken)
      }

      // Log logout
      await auditService.log({
        userId,
        action: 'USER_LOGOUT',
        resource: 'auth',
      })
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true }
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex')
      const resetExpires = new Date(Date.now() + this.PASSWORD_RESET_EXPIRES)

      // Store reset token (in Redis or temporary table)
      // TODO: Implement token storage

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`
      await emailService.sendPasswordResetEmail(user.email, resetUrl)

      // Log password reset request
      await auditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'auth',
      })

      return { success: true }
    } catch (error) {
      logger.error('Password reset error:', error)
      return { success: false, error: 'Failed to send reset email' }
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Validate new password
      if (!this.isStrongPassword(newPassword)) {
        return {
          success: false,
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        }
      }

      // Verify reset token and get user ID
      const redis = await import('../cache/redis').then(m => m.redis);
      const redisKey = `password_reset:${token}`;
      const tokenData = await redis.get(redisKey);
      
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }
      
      const { userId, email } = JSON.parse(tokenData);
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Hash new password
      const hashedPassword = await hash(newPassword, 12)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        },
      });

      // Delete the reset token
      await redis.del(redisKey);

      // Revoke all refresh tokens for security
      await tokenService.revokeAllUserTokens(userId);

      // Log password reset
      // await auditService.log({
      //   userId,
      //   action: 'PASSWORD_RESET',
      //   resource: 'auth',
      // })

      return { success: true }
    } catch (error) {
      logger.error('Password reset error:', error)
      return { success: false, error: 'Failed to reset password' }
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user || !user.password) {
        return { success: false, error: 'User not found' }
      }

      // Verify current password
      if (!(await compare(currentPassword, user.password))) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Validate new password
      if (!this.isStrongPassword(newPassword)) {
        return {
          success: false,
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        }
      }

      // Hash and update password
      const hashedPassword = await hash(newPassword, 12)
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      // Revoke all refresh tokens
      await tokenService.revokeAllUserTokens(userId)

      // Log password change
      await auditService.log({
        userId,
        action: 'PASSWORD_CHANGED',
        resource: 'auth',
      })

      return { success: true }
    } catch (error) {
      logger.error('Password change error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Verify email token and get user ID
      const redis = await import('../cache/redis').then(m => m.redis);
      const redisKey = `email_verification:${token}`;
      const tokenData = await redis.get(redisKey);
      
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired verification token'
        };
      }
      
      const { userId, email } = JSON.parse(tokenData);
      
      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          updatedAt: new Date()
        },
      });
      
      // Delete the verification token
      await redis.del(redisKey);

      // Log email verification
      // await auditService.log({
      //   userId,
      //   action: 'EMAIL_VERIFIED',
      //   resource: 'auth',
      // })

      return { success: true }
    } catch (error) {
      logger.error('Email verification error:', error)
      return { success: false, error: 'Invalid or expired verification link' }
    }
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: string, ipAddress?: string): Promise<void> {
    // Implement rate limiting with Redis
    const redis = await import('../cache/redis').then(m => m.redis);
    const attemptKey = `login_attempts:${userId}`;
    const currentAttempts = await redis.incr(attemptKey);
    
    // Set expiration on first attempt
    if (currentAttempts === 1) {
      await redis.expire(attemptKey, this.LOCKOUT_DURATION / 1000);
    }
    
    // Lock account if max attempts reached
    if (currentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockKey = `account_locked:${userId}`;
      await redis.setex(lockKey, this.LOCKOUT_DURATION / 1000, 'locked');
      
      await auditService.log({
        userId,
        action: 'ACCOUNT_LOCKED',
        resource: 'auth',
        ipAddress,
        details: { attempts: currentAttempts }
      });
    }
    
    await auditService.log({
      userId,
      action: 'LOGIN_FAILED',
      resource: 'auth',
      ipAddress,
      details: { attempts: currentAttempts }
    });
  }

  /**
   * Check if account is locked
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const redis = await import('../cache/redis').then(m => m.redis);
      const lockKey = `account_locked:${userId}`;
      const isLocked = await redis.exists(lockKey);
      return isLocked === 1;
    } catch (error) {
      logger.error('Error checking account lock status:', error);
      // Fail securely - assume locked if Redis is unavailable
      return true;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check password strength
   */
  private isStrongPassword(password: string): boolean {
    if (password.length < this.PASSWORD_MIN_LENGTH) return false
    
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
  }
}

// Export singleton instance
export const authService = new AuthService()