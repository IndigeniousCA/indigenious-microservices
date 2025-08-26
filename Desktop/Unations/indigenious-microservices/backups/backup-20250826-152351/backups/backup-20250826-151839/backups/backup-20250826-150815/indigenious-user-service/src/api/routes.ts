import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserService } from '../services/user-service';
import { ProfileService } from '../services/profile-service';
import { PreferencesService } from '../services/preferences-service';
import { uploadMiddleware } from '../middleware/upload';
import { logger } from '../utils/logger';

const router = Router();
const userService = new UserService();
const profileService = new ProfileService();
const preferencesService = new PreferencesService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get user by ID
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;
    
    // Check if user can access this profile
    if (userId !== requestingUserId && !(req as any).user.role?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Update user profile
router.put('/:userId/profile',
  authMiddleware,
  [
    param('userId').isUUID(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('displayName').optional().trim(),
    body('bio').optional().trim(),
    body('title').optional().trim(),
    body('organization').optional().trim(),
    body('phone').optional().isMobilePhone('any'),
    body('website').optional().isURL(),
    body('languages').optional().isArray(),
    body('primaryLanguage').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      // Check authorization
      if (userId !== requestingUserId && !(req as any).user.role?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedProfile = await profileService.updateProfile(userId, req.body);
      res.json(updatedProfile);
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Upload avatar
router.post('/:userId/avatar',
  authMiddleware,
  uploadMiddleware.single('avatar'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      if (userId !== requestingUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const avatarUrl = await profileService.uploadAvatar(userId, req.file);
      res.json({ avatarUrl });
    } catch (error: any) {
      logger.error('Avatar upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update business profile
router.put('/:userId/business-profile',
  authMiddleware,
  [
    param('userId').isUUID(),
    body('legalName').optional().trim().notEmpty(),
    body('businessName').optional().trim().notEmpty(),
    body('businessNumber').optional().trim(),
    body('taxNumber').optional().trim(),
    body('website').optional().isURL(),
    body('description').optional().trim(),
    body('yearEstablished').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
    body('employeeCount').optional().isInt({ min: 0 }),
    body('indigenousEmployeeCount').optional().isInt({ min: 0 }),
    body('industries').optional().isArray(),
    body('certifications').optional().isArray()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      if (userId !== requestingUserId && !(req as any).user.role?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const businessProfile = await profileService.updateBusinessProfile(userId, req.body);
      res.json(businessProfile);
    } catch (error: any) {
      logger.error('Update business profile error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Update preferences
router.put('/:userId/preferences',
  authMiddleware,
  [
    param('userId').isUUID(),
    body('theme').optional().isIn(['light', 'dark', 'auto']),
    body('language').optional().isString(),
    body('timezone').optional().isString(),
    body('currency').optional().isString(),
    body('dateFormat').optional().isString(),
    body('emailNotifications').optional().isBoolean(),
    body('smsNotifications').optional().isBoolean(),
    body('pushNotifications').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      if (userId !== requestingUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const preferences = await preferencesService.updatePreferences(userId, req.body);
      res.json(preferences);
    } catch (error: any) {
      logger.error('Update preferences error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get user preferences
router.get('/:userId/preferences', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;
    
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const preferences = await preferencesService.getPreferences(userId);
    res.json(preferences);
  } catch (error: any) {
    logger.error('Get preferences error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Update privacy settings
router.put('/:userId/privacy',
  authMiddleware,
  [
    param('userId').isUUID(),
    body('profileVisibility').optional().isIn(['public', 'registered', 'connections', 'private']),
    body('showEmail').optional().isBoolean(),
    body('showPhone').optional().isBoolean(),
    body('showLocation').optional().isBoolean(),
    body('allowMessages').optional().isBoolean(),
    body('allowConnectionRequests').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      if (userId !== requestingUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const privacySettings = await userService.updatePrivacySettings(userId, req.body);
      res.json(privacySettings);
    } catch (error: any) {
      logger.error('Update privacy settings error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Search users (admin only)
router.get('/search',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  async (req, res) => {
    try {
      const { q, role, type, status, limit = 20, offset = 0 } = req.query;
      
      const results = await userService.searchUsers({
        query: q as string,
        role: role as string,
        type: type as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json(results);
    } catch (error: any) {
      logger.error('Search users error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// List all users (admin only)
router.get('/',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { limit = 20, offset = 0, sortBy = 'createdAt', order = 'desc' } = req.query;
      
      const users = await userService.listUsers({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        order: order as string
      });
      
      res.json(users);
    } catch (error: any) {
      logger.error('List users error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Suspend user (admin only)
router.post('/:userId/suspend',
  authMiddleware,
  requireRole(['admin']),
  [
    param('userId').isUUID(),
    body('reason').notEmpty().trim(),
    body('duration').optional().isInt({ min: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body;
      const adminId = (req as any).user.id;
      
      await userService.suspendUser(userId, reason, duration, adminId);
      res.json({ message: 'User suspended successfully' });
    } catch (error: any) {
      logger.error('Suspend user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Reactivate user (admin only)
router.post('/:userId/reactivate',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = (req as any).user.id;
      
      await userService.reactivateUser(userId, adminId);
      res.json({ message: 'User reactivated successfully' });
    } catch (error: any) {
      logger.error('Reactivate user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete user account (self or admin)
router.delete('/:userId',
  authMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = (req as any).user.id;
      
      // Check authorization
      if (userId !== requestingUserId && !(req as any).user.role?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await userService.deleteUser(userId);
      res.json({ message: 'User account deleted successfully' });
    } catch (error: any) {
      logger.error('Delete user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Export user data (GDPR compliance)
router.get('/:userId/export', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;
    
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exportData = await userService.exportUserData(userId);
    res.json(exportData);
  } catch (error: any) {
    logger.error('Export user data error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as userRouter };