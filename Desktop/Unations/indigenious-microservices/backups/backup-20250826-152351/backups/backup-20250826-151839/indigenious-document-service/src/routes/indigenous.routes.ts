import { Router } from 'express';
import multer from 'multer';
import { IndigenousDocumentService } from '../services/indigenous-document.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * Create Indigenous-themed document
 */
router.post('/indigenous/create', authMiddleware, async (req, res) => {
  try {
    const result = await IndigenousDocumentService.createIndigenousDocument({
      ...req.body,
      userId: req.user.id
    });
    
    res.json({
      success: true,
      documentId: result.verificationId,
      metadata: result.metadata,
      message: 'Indigenous document created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Upload and process Indigenous document
 */
router.post('/indigenous/upload', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await IndigenousDocumentService.processIndigenousDocument({
      file: req.file,
      userId: req.user.id,
      businessId: req.body.businessId,
      isIndigenous: req.body.isIndigenous === 'true',
      language: req.body.language,
      culturalSensitivity: req.body.culturalSensitivity,
      requiresTranslation: req.body.requiresTranslation === 'true'
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Document processed with Indigenous support'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Apply Indigenous signature with Elder support
 */
router.post('/indigenous/sign/:documentId', authMiddleware, async (req, res) => {
  try {
    const result = await IndigenousDocumentService.applyIndigenousSignature({
      documentId: req.params.documentId,
      signerId: req.user.id,
      signerName: req.user.name,
      signerEmail: req.user.email,
      ...req.body
    });
    
    res.json({
      success: true,
      ...result,
      message: result.elderSignature ? 
        'Document signed with Elder authority' : 
        'Document signed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create Indigenous business template
 */
router.post('/indigenous/templates', authMiddleware, async (req, res) => {
  try {
    const result = await IndigenousDocumentService.createIndigenousTemplate({
      ...req.body,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Indigenous template created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Track document access with cultural sensitivity
 */
router.post('/indigenous/access/:documentId', authMiddleware, async (req, res) => {
  try {
    const result = await IndigenousDocumentService.trackDocumentAccess({
      documentId: req.params.documentId,
      userId: req.user.id,
      action: req.body.action || 'view',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Access tracked with cultural sensitivity check'
    });
  } catch (error: any) {
    if (error.message.includes('Cultural sensitivity')) {
      res.status(403).json({
        success: false,
        error: error.message,
        culturalRestriction: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Get Indigenous document templates
 */
router.get('/indigenous/templates', async (req, res) => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: {
        isIndigenous: true,
        isPublic: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        templateType: true,
        language: true,
        description: true
      }
    });
    
    res.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify document authenticity
 */
router.get('/indigenous/verify/:verificationCode', async (req, res) => {
  try {
    const signature = await prisma.digitalSignature.findUnique({
      where: { verificationCode: req.params.verificationCode },
      include: {
        document: true,
        attestations: true
      }
    });
    
    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification code'
      });
    }
    
    res.json({
      success: true,
      verified: true,
      document: {
        id: signature.document.id,
        name: signature.document.originalName,
        isIndigenous: signature.document.isIndigenous,
        culturalSensitivity: signature.document.culturalSensitivity
      },
      signature: {
        signerName: signature.signerName,
        signerRole: signature.signerRole,
        timestamp: signature.timestamp,
        isElder: signature.metadata?.isElder || false,
        witnessCount: signature.attestations.length
      },
      message: 'Document authenticity verified'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get document with cultural permissions
 */
router.get('/indigenous/documents/:documentId', authMiddleware, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    // Check cultural permissions
    if (document.culturalSensitivity === 'sacred' || document.culturalSensitivity === 'restricted') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user?.isIndigenous && document.culturalSensitivity === 'restricted') {
        return res.status(403).json({
          success: false,
          error: 'Access restricted to Indigenous users',
          culturalRestriction: true
        });
      }
      
      if (!user?.isElder && document.culturalSensitivity === 'sacred') {
        return res.status(403).json({
          success: false,
          error: 'Access restricted to Elders',
          culturalRestriction: true
        });
      }
    }
    
    // Track access
    await IndigenousDocumentService.trackDocumentAccess({
      documentId: req.params.documentId,
      userId: req.user.id,
      action: 'view',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      document: {
        ...document,
        accessGranted: true,
        culturalPermission: document.culturalSensitivity
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;