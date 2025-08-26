import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { AuthService } from '../services/auth-service';
import { MFAService } from '../services/mfa-service';
import { TokenService } from '../services/token-service';
import { IndigenousVerificationService } from '../services/indigenous-verification';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();
const mfaService = new MFAService();
const tokenService = new TokenService();
const verificationService = new IndigenousVerificationService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('businessName').optional().trim(),
    body('indigenousCommunity').optional().trim(),
    body('bandNumber').optional().trim()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      // Set secure cookie with refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const result = await tokenService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await authService.logout(userId);
    
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await authService.getUserById(userId);
    res.json(user);
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(404).json({ error: error.message });
  }
});

// MFA endpoints
router.post('/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await mfaService.enableMFA(userId);
    res.json(result);
  } catch (error: any) {
    logger.error('MFA enable error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mfa/verify',
  [
    body('userId').notEmpty(),
    body('token').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId, token } = req.body;
      const isValid = await mfaService.verifyMFAToken(userId, token);
      res.json({ valid: isValid });
    } catch (error: any) {
      logger.error('MFA verify error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/mfa/disable', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await mfaService.disableMFA(userId);
    res.json({ message: 'MFA disabled successfully' });
  } catch (error: any) {
    logger.error('MFA disable error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Indigenous verification endpoints
router.post('/verify/indigenous', 
  authMiddleware,
  [
    body('bandNumber').notEmpty(),
    body('communityName').notEmpty(),
    body('documentType').isIn(['status-card', 'band-letter', 'treaty-card']),
    body('documentNumber').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const result = await verificationService.verifyIndigenousStatus({
        userId,
        ...req.body
      });
      res.json(result);
    } catch (error: any) {
      logger.error('Indigenous verification error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/verify/status/:userId', authMiddleware, async (req, res) => {
  try {
    const status = await verificationService.getVerificationStatus(req.params.userId);
    res.json(status);
  } catch (error: any) {
    logger.error('Get verification status error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Password reset endpoints
router.post('/password/reset-request',
  [
    body('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  async (req, res) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ message: 'Password reset email sent if account exists' });
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      // Don't reveal if email exists or not
      res.json({ message: 'Password reset email sent if account exists' });
    }
  }
);

router.post('/password/reset',
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      logger.error('Password reset error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Change password (authenticated)
router.post('/password/change',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(userId, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      logger.error('Password change error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Session management
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const sessions = await authService.getUserSessions(userId);
    res.json(sessions);
  } catch (error: any) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await authService.revokeSession(userId, req.params.sessionId);
    res.json({ message: 'Session revoked successfully' });
  } catch (error: any) {
    logger.error('Revoke session error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as authRouter };