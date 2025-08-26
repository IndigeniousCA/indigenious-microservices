import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';

export interface AuthRequest extends NextRequest {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

export async function authenticate(
  request: NextRequest
): Promise<{ authorized: boolean; user?: any; error?: string }> {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { 
        authorized: false, 
        error: 'Authentication required' 
      };
    }
    
    // Verify user is active
    const { default: prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        businessProfile: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!user || user.status !== 'active') {
      return { 
        authorized: false, 
        error: 'Account inactive or not found' 
      };
    }
    
    // Extract permissions
    const permissions = user.businessProfile?.permissions?.map(p => p.name) || [];
    
    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions
      }
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return { 
      authorized: false, 
      error: 'Authentication failed' 
    };
  }
}

export function authorize(...requiredPermissions: string[]) {
  return async (request: NextRequest): Promise<{ authorized: boolean; error?: string }> => {
    const auth = await authenticate(request);
    
    if (!auth.authorized) {
      return auth;
    }
    
    // Check if user has required permissions
    const hasPermission = requiredPermissions.every(permission =>
      auth.user!.permissions.includes(permission) || 
      auth.user!.role === 'admin' // Admins bypass permission checks
    );
    
    if (!hasPermission) {
      logger.warn('Permission denied:', {
        userId: auth.user!.id,
        required: requiredPermissions,
        actual: auth.user!.permissions
      });
      
      return { 
        authorized: false, 
        error: 'Insufficient permissions' 
      };
    }
    
    return { authorized: true };
  };
}

// Helper function to check PR permissions
export async function checkPRPermission(
  request: NextRequest,
  operation: string
): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const auth = await authenticate(request);
  
  if (!auth.authorized) {
    return { allowed: false, error: auth.error };
  }
  
  const prPermissions = [
    'pr.view',
    'pr.create',
    'pr.edit',
    'pr.delete',
    'pr.operations.create',
    'pr.operations.execute',
    'pr.crisis.manage',
    'pr.strategic.approve'
  ];
  
  const requiredPermission = `pr.${operation}`;
  
  if (!prPermissions.includes(requiredPermission)) {
    return { allowed: false, error: 'Invalid permission type' };
  }
  
  const hasPermission = 
    auth.user!.permissions.includes(requiredPermission) ||
    auth.user!.permissions.includes('pr.admin') ||
    auth.user!.role === 'admin';
    
  if (!hasPermission) {
    return { 
      allowed: false, 
      error: `Missing permission: ${requiredPermission}` 
    };
  }
  
  return { allowed: true, user: auth.user };
}