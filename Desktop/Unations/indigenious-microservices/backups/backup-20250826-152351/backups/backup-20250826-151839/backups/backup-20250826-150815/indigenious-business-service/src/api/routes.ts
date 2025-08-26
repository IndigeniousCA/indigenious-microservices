import { Router } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authMiddleware, requireRole, requireVerification } from '../middleware/auth';
import { BusinessService } from '../services/business-service';
import { DirectoryService } from '../services/directory-service';
import { VerificationService } from '../services/verification-service';
import { SearchService } from '../services/search-service';
import { logger } from '../utils/logger';

const router = Router();
const businessService = new BusinessService();
const directoryService = new DirectoryService();
const verificationService = new VerificationService();
const searchService = new SearchService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register new business
router.post('/register',
  authMiddleware,
  [
    body('legalName').notEmpty().trim(),
    body('businessName').notEmpty().trim(),
    body('businessNumber').optional().trim(),
    body('taxNumber').optional().trim(),
    body('description').notEmpty().trim().isLength({ max: 2000 }),
    body('yearEstablished').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
    body('employeeCount').optional().isInt({ min: 0 }),
    body('indigenousEmployeeCount').optional().isInt({ min: 0 }),
    body('website').optional().isURL(),
    body('email').isEmail(),
    body('phone').isMobilePhone('any'),
    body('address').isObject(),
    body('address.street').notEmpty(),
    body('address.city').notEmpty(),
    body('address.province').notEmpty(),
    body('address.postalCode').notEmpty(),
    body('address.country').notEmpty(),
    body('industries').isArray().notEmpty(),
    body('servicesOffered').isArray(),
    body('indigenousOwnership').isBoolean(),
    body('ownershipPercentage').optional().isInt({ min: 0, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const business = await businessService.registerBusiness({
        ...req.body,
        ownerId: userId
      });
      res.status(201).json(business);
    } catch (error: any) {
      logger.error('Business registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get business by ID
router.get('/:businessId', async (req, res) => {
  try {
    const business = await businessService.getBusinessById(req.params.businessId);
    res.json(business);
  } catch (error: any) {
    logger.error('Get business error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Update business
router.put('/:businessId',
  authMiddleware,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      
      // Check ownership
      const business = await businessService.getBusinessById(businessId);
      if (business.owner_id !== userId && !(req as any).user.role?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updated = await businessService.updateBusiness(businessId, req.body);
      res.json(updated);
    } catch (error: any) {
      logger.error('Update business error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Directory listing (public with filters)
router.get('/',
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
  queryValidator('industries').optional(),
  queryValidator('province').optional(),
  queryValidator('city').optional(),
  queryValidator('indigenousOwned').optional().isBoolean(),
  queryValidator('verified').optional().isBoolean(),
  queryValidator('sortBy').optional().isIn(['name', 'created', 'rating', 'employees']),
  queryValidator('order').optional().isIn(['asc', 'desc']),
  validateRequest,
  async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        industries: req.query.industries ? (req.query.industries as string).split(',') : undefined,
        province: req.query.province as string,
        city: req.query.city as string,
        indigenousOwned: req.query.indigenousOwned === 'true',
        verified: req.query.verified === 'true',
        sortBy: req.query.sortBy as string || 'created',
        order: req.query.order as string || 'desc'
      };
      
      const results = await directoryService.listBusinesses(filters);
      res.json(results);
    } catch (error: any) {
      logger.error('Directory listing error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Search businesses
router.get('/search',
  [
    queryValidator('q').notEmpty().trim(),
    queryValidator('filters').optional(),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const searchParams = {
        query: req.query.q as string,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : {},
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };
      
      const results = await searchService.searchBusinesses(searchParams);
      res.json(results);
    } catch (error: any) {
      logger.error('Search error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Request Indigenous verification
router.post('/:businessId/verify/indigenous',
  authMiddleware,
  requireRole(['business_owner']),
  [
    param('businessId').isUUID(),
    body('documentType').isIn(['incorporation', 'ownership', 'band-letter', 'certification']),
    body('documentUrl').isURL(),
    body('additionalInfo').optional().trim()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      
      // Check ownership
      const business = await businessService.getBusinessById(businessId);
      if (business.owner_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const verification = await verificationService.requestIndigenousVerification({
        businessId,
        userId,
        ...req.body
      });
      
      res.json(verification);
    } catch (error: any) {
      logger.error('Verification request error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get verification status
router.get('/:businessId/verify/status',
  authMiddleware,
  async (req, res) => {
    try {
      const status = await verificationService.getVerificationStatus(req.params.businessId);
      res.json(status);
    } catch (error: any) {
      logger.error('Get verification status error:', error);
      res.status(404).json({ error: error.message });
    }
  }
);

// Admin: Approve/Reject verification
router.post('/:businessId/verify/review',
  authMiddleware,
  requireRole(['admin', 'moderator']),
  [
    param('businessId').isUUID(),
    body('status').isIn(['approved', 'rejected']),
    body('notes').optional().trim(),
    body('expiryDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const reviewerId = (req as any).user.id;
      
      const result = await verificationService.reviewVerification({
        businessId,
        reviewerId,
        ...req.body
      });
      
      res.json(result);
    } catch (error: any) {
      logger.error('Verification review error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get business statistics
router.get('/:businessId/stats',
  async (req, res) => {
    try {
      const stats = await businessService.getBusinessStats(req.params.businessId);
      res.json(stats);
    } catch (error: any) {
      logger.error('Get business stats error:', error);
      res.status(404).json({ error: error.message });
    }
  }
);

// Add certification
router.post('/:businessId/certifications',
  authMiddleware,
  [
    param('businessId').isUUID(),
    body('name').notEmpty().trim(),
    body('issuer').notEmpty().trim(),
    body('issueDate').isISO8601(),
    body('expiryDate').optional().isISO8601(),
    body('documentUrl').optional().isURL()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      
      // Check ownership
      const business = await businessService.getBusinessById(businessId);
      if (business.owner_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const certification = await businessService.addCertification(businessId, req.body);
      res.json(certification);
    } catch (error: any) {
      logger.error('Add certification error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get nearby businesses
router.get('/nearby',
  [
    queryValidator('lat').isFloat({ min: -90, max: 90 }),
    queryValidator('lng').isFloat({ min: -180, max: 180 }),
    queryValidator('radius').optional().isInt({ min: 1, max: 500 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const params = {
        latitude: parseFloat(req.query.lat as string),
        longitude: parseFloat(req.query.lng as string),
        radius: parseInt(req.query.radius as string) || 50, // km
        limit: parseInt(req.query.limit as string) || 20
      };
      
      const businesses = await directoryService.getNearbyBusinesses(params);
      res.json(businesses);
    } catch (error: any) {
      logger.error('Get nearby businesses error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Featured businesses
router.get('/featured',
  async (req, res) => {
    try {
      const featured = await directoryService.getFeaturedBusinesses();
      res.json(featured);
    } catch (error: any) {
      logger.error('Get featured businesses error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Business categories/industries
router.get('/categories',
  async (req, res) => {
    try {
      const categories = await directoryService.getCategories();
      res.json(categories);
    } catch (error: any) {
      logger.error('Get categories error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete business (soft delete)
router.delete('/:businessId',
  authMiddleware,
  async (req, res) => {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.id;
      
      // Check ownership
      const business = await businessService.getBusinessById(businessId);
      if (business.owner_id !== userId && !(req as any).user.role?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await businessService.deleteBusiness(businessId);
      res.json({ message: 'Business deleted successfully' });
    } catch (error: any) {
      logger.error('Delete business error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export { router as businessRouter };