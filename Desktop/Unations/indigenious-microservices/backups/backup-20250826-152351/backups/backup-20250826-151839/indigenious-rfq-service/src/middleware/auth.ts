import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    businessId?: string;
    indigenousVerified?: boolean;
  };
}

// Permission definitions (copied from auth service)
export const Permissions = {
  // RFQ permissions
  RFQ_CREATE: 'rfq.create',
  RFQ_UPDATE: 'rfq.update',
  RFQ_DELETE: 'rfq.delete',
  RFQ_VIEW_ALL: 'rfq.view_all',
  RFQ_BID: 'rfq.bid',
  
  // Bid permissions
  BID_CREATE: 'bid.create',
  BID_UPDATE: 'bid.update',
  BID_DELETE: 'bid.delete',
  BID_VIEW_PRIVATE: 'bid.view_private',
  
  // Admin permissions
  ADMIN_FULL_ACCESS: 'admin.full_access',
  ADMIN_BUSINESS_VERIFY: 'admin.business.verify',
} as const;

// Role-based permission mapping
const rolePermissions: Record<string, string[]> = {
  USER: [
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
  ],
  BUSINESS_OWNER: [
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
  ],
  GOVERNMENT_OFFICER: [
    Permissions.RFQ_CREATE,
    Permissions.RFQ_UPDATE,
    Permissions.RFQ_VIEW_ALL,
    Permissions.BID_VIEW_PRIVATE,
  ],
  BAND_ADMIN: [
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
    Permissions.RFQ_CREATE,
    Permissions.RFQ_UPDATE,
  ],
  ADMIN: [
    ...Object.values(Permissions).filter(p => !p.startsWith('admin.full')),
  ],
  SUPER_ADMIN: Object.values(Permissions),
};

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : authHeader.startsWith('Session ')
      ? authHeader.substring(8)
      : authHeader;

    if (!token) {
      res.status(401).json({ error: 'Token required' });
      return;
    }

    // For internal service calls, verify service token
    if (token.startsWith('service_')) {
      if (token === process.env.INTERNAL_SERVICE_TOKEN) {
        req.user = {
          id: 'system',
          email: 'system@indigenious.ca',
          role: 'SYSTEM',
          permissions: Object.values(Permissions)
        };
        next();
        return;
      } else {
        res.status(401).json({ error: 'Invalid service token' });
        return;
      }
    }

    // For user sessions, call auth service to verify
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    const response = await fetch(`${authServiceUrl}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const userData = await response.json();
    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: rolePermissions[userData.role] || [],
      businessId: userData.businessId,
      indigenousVerified: userData.indigenousVerified
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient role permissions' });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.user.permissions.includes(permission) && 
        !req.user.permissions.includes(Permissions.ADMIN_FULL_ACCESS)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireAnyPermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    ) || req.user.permissions.includes(Permissions.ADMIN_FULL_ACCESS);

    if (!hasPermission) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireBusinessOwnership() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.businessId) {
      res.status(403).json({ error: 'Business ownership required' });
      return;
    }

    next();
  };
}

export function requireIndigenousVerification() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.indigenousVerified) {
      res.status(403).json({ error: 'Indigenous verification required' });
      return;
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Try to authenticate but don't fail if no auth provided
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }

  authMiddleware(req, res, (error) => {
    if (error) {
      // Log error but continue without auth
      logger.warn('Optional auth failed:', error);
    }
    next();
  });
}