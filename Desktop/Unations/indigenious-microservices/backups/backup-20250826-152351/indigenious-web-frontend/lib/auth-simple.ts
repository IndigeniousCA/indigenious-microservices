import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function signInUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true }
    })

    if (!user || !user.passwordHash) {
      return { error: 'Invalid credentials' }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    
    if (!isValid) {
      return { error: 'Invalid credentials' }
    }

    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business?.id
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    )

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business?.id
      },
      token
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return { error: 'Authentication failed' }
  }
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret')
  } catch {
    return null
  }
}