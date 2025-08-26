import { Router } from 'express';
import { 
  authMiddleware, 
  requireRole, 
  requirePermission, 
  requireAnyPermission,
  requireBusinessOwnership,
  optionalAuth,
  Permissions,
  AuthenticatedRequest 
} from '../middleware/auth';
import { validate, rfqSchemas, bidSchemas, templateSchemas, commonSchemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { RFQService } from '../services/rfq-service';
import { BidService } from '../services/bid-service';
import { TemplateService } from '../services/template-service';
import { InvitationService } from '../services/invitation-service';
import { ContractService } from '../services/contract-service';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services
const rfqService = new RFQService();
const bidService = new BidService();
const templateService = new TemplateService();
const invitationService = new InvitationService();
const contractService = new ContractService();

// =============================================================================
// RFQ ROUTES
// =============================================================================

// Create new RFQ
router.post('/',
  authMiddleware,
  requirePermission(Permissions.RFQ_CREATE),
  validate(rfqSchemas.create),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await rfqService.createRFQ(
      req.body,
      req.user!.id,
      req.user!.businessId || req.user!.role // Government entity
    );
    res.status(201).json(rfq);
  })
);

// Get RFQ by ID (public, but increments views if authenticated)
router.get('/:id',
  validate(commonSchemas.id, 'params'),
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await rfqService.getRFQById(req.params.id, req.user?.id);
    res.json(rfq);
  })
);

// Update RFQ
router.put('/:id',
  authMiddleware,
  requirePermission(Permissions.RFQ_UPDATE),
  validate(commonSchemas.id, 'params'),
  validate(rfqSchemas.update),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await rfqService.updateRFQ(req.params.id, req.body, req.user!.id);
    res.json(rfq);
  })
);

// Close RFQ
router.post('/:id/close',
  authMiddleware,
  requirePermission(Permissions.RFQ_UPDATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { reason } = req.body;
    const rfq = await rfqService.closeRFQ(req.params.id, req.user!.id, reason);
    res.json(rfq);
  })
);

// Search RFQs (public with optional auth for personalization)
router.get('/',
  validate(rfqSchemas.search, 'query'),
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const results = await rfqService.searchRFQs(req.query as any, req.user?.id);
    res.json(results);
  })
);

// Get RFQ analytics (owner only)
router.get('/:id/analytics',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const analytics = await rfqService.getRFQAnalytics(req.params.id, req.user!.id);
    res.json(analytics);
  })
);

// Get matching RFQs for business
router.get('/matches/business/:businessId',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const matches = await rfqService.getMatchingRFQs(req.params.businessId);
    res.json(matches);
  })
);

// =============================================================================
// BID ROUTES
// =============================================================================

// Submit bid
router.post('/:rfqId/bids',
  authMiddleware,
  requirePermission(Permissions.BID_CREATE),
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  validate(bidSchemas.submit),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const bidData = { ...req.body, rfq_id: req.params.rfqId };
    const bid = await bidService.submitBid(bidData, req.user!.businessId!, req.user!.id);
    res.status(201).json(bid);
  })
);

// Get bid by ID
router.get('/bids/:bidId',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const bid = await bidService.getBidById(req.params.bidId, req.user!.id);
    res.json(bid);
  })
);

// Update bid
router.put('/bids/:bidId',
  authMiddleware,
  requirePermission(Permissions.BID_UPDATE),
  validate(commonSchemas.id, 'params'),
  validate(bidSchemas.update),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const bid = await bidService.updateBid(req.params.bidId, req.body, req.user!.id);
    res.json(bid);
  })
);

// Withdraw bid
router.post('/bids/:bidId/withdraw',
  authMiddleware,
  requirePermission(Permissions.BID_UPDATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { reason } = req.body;
    const bid = await bidService.withdrawBid(req.params.bidId, req.user!.id, reason);
    res.json(bid);
  })
);

// Get bids for RFQ (owner sees all, others see public data)
router.get('/:rfqId/bids',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const hasPrivateAccess = req.user!.permissions.includes(Permissions.BID_VIEW_PRIVATE);
    const bids = await bidService.getBidsForRFQ(req.params.rfqId, req.user!.id, hasPrivateAccess);
    res.json(bids);
  })
);

// Evaluate bid (RFQ owner only)
router.post('/bids/:bidId/evaluate',
  authMiddleware,
  requirePermission(Permissions.BID_VIEW_PRIVATE),
  validate(commonSchemas.id, 'params'),
  validate(bidSchemas.evaluate),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const bid = await bidService.evaluateBid(req.params.bidId, req.body, req.user!.id);
    res.json(bid);
  })
);

// Get bids for business
router.get('/business/:businessId/bids',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const results = await bidService.getBidsForBusiness(req.params.businessId, req.query as any);
    res.json(results);
  })
);

// Generate bid comparison
router.post('/:rfqId/bids/compare',
  authMiddleware,
  requirePermission(Permissions.BID_VIEW_PRIVATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { bidIds } = req.body;
    const comparison = await bidService.generateBidComparison(req.params.rfqId, bidIds);
    res.json(comparison);
  })
);

// Get bid statistics
router.get('/bids/statistics',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { businessId, rfqId } = req.query;
    const stats = await bidService.getBidStatistics(businessId as string, rfqId as string);
    res.json(stats);
  })
);

// =============================================================================
// TEMPLATE ROUTES
// =============================================================================

// Create template
router.post('/templates',
  authMiddleware,
  requirePermission(Permissions.RFQ_CREATE),
  validate(templateSchemas.create),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const template = await templateService.createTemplate(req.body, req.user!.id);
    res.status(201).json(template);
  })
);

// Get template by ID
router.get('/templates/:id',
  validate(commonSchemas.id, 'params'),
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const template = await templateService.getTemplateById(req.params.id, req.user?.id);
    res.json(template);
  })
);

// Update template
router.put('/templates/:id',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const template = await templateService.updateTemplate(req.params.id, req.body, req.user!.id);
    res.json(template);
  })
);

// Delete template
router.delete('/templates/:id',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await templateService.deleteTemplate(req.params.id, req.user!.id);
    res.status(204).send();
  })
);

// Get templates
router.get('/templates',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const results = await templateService.getTemplates(req.query as any);
    res.json(results);
  })
);

// Get popular templates
router.get('/templates/popular',
  asyncHandler(async (req, res) => {
    const { category, limit } = req.query;
    const templates = await templateService.getPopularTemplates(
      category as string, 
      parseInt(limit as string) || 10
    );
    res.json(templates);
  })
);

// Duplicate template
router.post('/templates/:id/duplicate',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name } = req.body;
    const template = await templateService.duplicateTemplate(req.params.id, req.user!.id, name);
    res.status(201).json(template);
  })
);

// Create RFQ from template
router.post('/templates/:id/create-rfq',
  authMiddleware,
  requirePermission(Permissions.RFQ_CREATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfqData = await templateService.createRFQFromTemplate(
      req.params.id, 
      req.body, 
      req.user!.id
    );
    
    // Actually create the RFQ
    const rfq = await rfqService.createRFQ(
      rfqData.rfq_data,
      req.user!.id,
      req.user!.businessId || req.user!.role
    );
    
    res.status(201).json({ ...rfq, template_id: req.params.id });
  })
);

// Get template usage statistics
router.get('/templates/:id/statistics',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const stats = await templateService.getTemplateUsageStats(req.params.id, req.user!.id);
    res.json(stats);
  })
);

// Get template categories
router.get('/templates/categories',
  asyncHandler(async (req, res) => {
    const categories = await templateService.getTemplateCategories();
    res.json(categories);
  })
);

// =============================================================================
// INVITATION ROUTES
// =============================================================================

// Send bulk invitations
router.post('/:rfqId/invitations/bulk',
  authMiddleware,
  requirePermission(Permissions.RFQ_UPDATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { criteria, customMessage } = req.body;
    const result = await invitationService.inviteBusinessesToRFQ(
      req.params.rfqId, 
      criteria, 
      req.user!.id, 
      customMessage
    );
    res.json(result);
  })
);

// Send direct invitation
router.post('/:rfqId/invitations',
  authMiddleware,
  requirePermission(Permissions.RFQ_UPDATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { businessId, customMessage } = req.body;
    const invitation = await invitationService.sendDirectInvitation(
      req.params.rfqId, 
      businessId, 
      req.user!.id, 
      customMessage
    );
    res.status(201).json(invitation);
  })
);

// Respond to invitation
router.post('/invitations/:invitationId/respond',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { response, message } = req.body;
    const result = await invitationService.respondToInvitation(
      req.params.invitationId, 
      response, 
      req.user!.businessId!, 
      message
    );
    res.json(result);
  })
);

// Get invitations for RFQ
router.get('/:rfqId/invitations',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const invitations = await invitationService.getInvitationsForRFQ(req.params.rfqId, req.user!.id);
    res.json(invitations);
  })
);

// Get invitations for business
router.get('/business/:businessId/invitations',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status } = req.query;
    const invitations = await invitationService.getInvitationsForBusiness(
      req.params.businessId, 
      status as string
    );
    res.json(invitations);
  })
);

// Get invitation statistics
router.get('/invitations/statistics',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rfqId, businessId } = req.query;
    const stats = await invitationService.getInvitationStatistics(
      rfqId as string, 
      businessId as string
    );
    res.json(stats);
  })
);

// =============================================================================
// CONTRACT ROUTES
// =============================================================================

// Award contract
router.post('/:rfqId/contract/award',
  authMiddleware,
  requirePermission(Permissions.RFQ_UPDATE),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contractData = { ...req.body, rfq_id: req.params.rfqId };
    const contract = await contractService.awardContract(contractData, req.user!.id);
    res.status(201).json(contract);
  })
);

// Get contract by ID
router.get('/contracts/:contractId',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contract = await contractService.getContractById(req.params.contractId, req.user!.id);
    res.json(contract);
  })
);

// Update contract
router.put('/contracts/:contractId',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contract = await contractService.updateContract(
      req.params.contractId, 
      req.body, 
      req.user!.id
    );
    res.json(contract);
  })
);

// Process payment
router.post('/contracts/:contractId/payments/:milestoneId',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { amount } = req.body;
    const payment = await contractService.processPayment(
      req.params.contractId, 
      req.params.milestoneId, 
      amount, 
      req.user!.id
    );
    res.json(payment);
  })
);

// Get contracts for business
router.get('/business/:businessId/contracts',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const results = await contractService.getContractsForBusiness(
      req.params.businessId, 
      req.query as any
    );
    res.json(results);
  })
);

// Get contracts for RFQ owner
router.get('/owner/contracts',
  authMiddleware,
  requirePermission(Permissions.RFQ_CREATE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const results = await contractService.getContractsForRFQOwner(
      req.user!.id, 
      req.query as any
    );
    res.json(results);
  })
);

// Generate contract document
router.post('/contracts/:contractId/document',
  authMiddleware,
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const document = await contractService.generateContractDocument(
      req.params.contractId, 
      req.user!.id
    );
    res.json(document);
  })
);

// Get contract statistics
router.get('/contracts/statistics',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { businessId, ownerId } = req.query;
    const stats = await contractService.getContractStatistics(
      businessId as string, 
      ownerId as string
    );
    res.json(stats);
  })
);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Express interest in RFQ
router.post('/:rfqId/interest',
  authMiddleware,
  requireBusinessOwnership(),
  validate(commonSchemas.id, 'params'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // This could be a simple interest tracking system
    res.json({ message: 'Interest recorded' });
  })
);

// Upload document (placeholder)
router.post('/documents/upload',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // This would integrate with document upload service
    res.json({ 
      message: 'Document upload endpoint',
      note: 'Integrate with S3 or similar service'
    });
  })
);

// Search suggestions
router.get('/search/suggestions',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    // This would provide search suggestions based on query
    res.json({
      query: q,
      suggestions: [
        'Construction services',
        'Consulting services',
        'IT solutions',
        'Maintenance contracts'
      ]
    });
  })
);

export { router as rfqRouter };