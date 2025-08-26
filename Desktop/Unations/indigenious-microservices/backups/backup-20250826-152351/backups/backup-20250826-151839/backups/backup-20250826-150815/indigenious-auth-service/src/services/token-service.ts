/**
 * JWT Token Service
 * Handles access tokens and refresh tokens with rotation
 */

import jwt from 'jsonwebtoken'
import { logger } from '@/lib/monitoring/logger';
import { randomBytes } from 'crypto'
import { addDays, addMinutes, isAfter } from 'date-fns'
import prisma from '../prisma'
import { User } from '@prisma/client'

export interface TokenPayload {
  sub: string // User ID
  email: string
  role: string
  sessionId?: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface DecodedToken extends TokenPayload {
  iat: number
  exp: number
}

export class TokenService {
  private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60 // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 // 7 days
  private readonly REFRESH_TOKEN_REUSE_WINDOW = 2 * 60 // 2 minutes grace period
  
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || `${this.jwtSecret}-refresh`

    if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'dev-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set in production')
    }
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(user: Pick<User, 'id' | 'email' | 'role'>, sessionId?: string): Promise<TokenPair> {
    // Create payload
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    }

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    })

    // Generate refresh token
    const refreshTokenValue = this.generateRefreshToken()
    const refreshExpiresAt = addDays(new Date(), 7)

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    })

    // Create signed refresh token with metadata
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: refreshTokenValue, // Token ID for validation
      },
      this.jwtRefreshSecret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      }
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): DecodedToken {
    try {
      return jwt.verify(token, this.jwtSecret) as DecodedToken
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token')
      }
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token signature
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as {
        sub: string
        jti: string
      }

      // Look up refresh token in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: decoded.jti },
        include: { user: true },
      })

      if (!storedToken) {
        throw new Error('Refresh token not found')
      }

      // Check if token has been revoked
      if (storedToken.revokedAt) {
        // Possible token reuse attack - revoke all user's tokens
        await this.revokeAllUserTokens(storedToken.userId)
        throw new Error('Refresh token has been revoked')
      }

      // Check if token has been used
      if (storedToken.usedAt) {
        // Check if within reuse window (for race conditions)
        const reuseCutoff = addMinutes(storedToken.usedAt, this.REFRESH_TOKEN_REUSE_WINDOW / 60)
        if (isAfter(new Date(), reuseCutoff)) {
          // Outside reuse window - possible attack
          await this.revokeAllUserTokens(storedToken.userId)
          throw new Error('Refresh token has already been used')
        }
      }

      // Check if token is expired
      if (isAfter(new Date(), storedToken.expiresAt)) {
        throw new Error('Refresh token expired')
      }

      // Mark token as used
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      })

      // Generate new token pair (rotation)
      return this.generateTokenPair(storedToken.user)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token')
      }
      throw error
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as {
        jti: string
      }

      await prisma.refreshToken.update({
        where: { token: decoded.jti },
        data: { revokedAt: new Date() },
      })
    } catch (error) {
      // Token might be invalid, but we don't throw here
      logger.error('Failed to revoke refresh token:', error)
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    })

    return result.count
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{
    id: string
    createdAt: Date
    lastUsed: Date
    expiresAt: Date
  }>> {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return tokens.map(token => ({
      id: token.id,
      createdAt: token.createdAt,
      lastUsed: token.usedAt || token.createdAt,
      expiresAt: token.expiresAt,
    }))
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token)
  }

  /**
   * Generate a cryptographically secure refresh token
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Create a short-lived token for specific purposes
   */
  createTemporaryToken(payload: unknown, expiresIn: string | number): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn })
  }

  /**
   * Verify a temporary token
   */
  verifyTemporaryToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService()