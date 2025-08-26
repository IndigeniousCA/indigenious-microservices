import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error-handler';

export function validate(schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      next(new ValidationError('Validation failed', details));
      return;
    }

    // Replace the source data with validated/sanitized data
    if (source === 'body') req.body = value;
    else if (source === 'params') req.params = value;
    else req.query = value;

    next();
  };
}

// RFQ validation schemas
export const rfqSchemas = {
  create: Joi.object({
    title: Joi.string().min(10).max(200).required(),
    description: Joi.string().min(50).max(5000).required(),
    category: Joi.string().valid(
      'construction', 'consulting', 'maintenance', 'supplies',
      'technology', 'transportation', 'professional-services',
      'healthcare', 'education', 'environmental', 'other'
    ).required(),
    subcategory: Joi.string().max(100).optional(),
    location: Joi.object({
      address: Joi.string().required(),
      city: Joi.string().required(),
      province: Joi.string().required(),
      postal_code: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).required(),
    budget_min: Joi.number().min(0).optional(),
    budget_max: Joi.number().min(0).when('budget_min', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('budget_min')),
      otherwise: Joi.number().min(0)
    }).optional(),
    timeline_days: Joi.number().integer().min(1).max(730).required(),
    skills_required: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    requirements: Joi.string().max(2000).optional(),
    deliverables: Joi.string().max(2000).optional(),
    evaluation_criteria: Joi.string().max(1000).optional(),
    indigenous_only: Joi.boolean().default(false),
    closing_date: Joi.date().min('now').required(),
    documents: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().valid('specification', 'drawing', 'reference', 'other').required()
    })).max(10).optional(),
    contact_info: Joi.object({
      name: Joi.string().max(100).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().max(20).optional()
    }).required()
  }),

  update: Joi.object({
    title: Joi.string().min(10).max(200).optional(),
    description: Joi.string().min(50).max(5000).optional(),
    budget_min: Joi.number().min(0).optional(),
    budget_max: Joi.number().min(0).optional(),
    timeline_days: Joi.number().integer().min(1).max(730).optional(),
    skills_required: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    requirements: Joi.string().max(2000).optional(),
    deliverables: Joi.string().max(2000).optional(),
    evaluation_criteria: Joi.string().max(1000).optional(),
    closing_date: Joi.date().min('now').optional(),
    contact_info: Joi.object({
      name: Joi.string().max(100),
      email: Joi.string().email(),
      phone: Joi.string().max(20)
    }).optional()
  }).min(1),

  search: Joi.object({
    q: Joi.string().max(200).optional(),
    category: Joi.string().valid(
      'construction', 'consulting', 'maintenance', 'supplies',
      'technology', 'transportation', 'professional-services',
      'healthcare', 'education', 'environmental', 'other'
    ).optional(),
    location: Joi.string().max(100).optional(),
    budget_min: Joi.number().min(0).optional(),
    budget_max: Joi.number().min(0).optional(),
    indigenous_only: Joi.boolean().optional(),
    skills: Joi.string().max(200).optional(), // comma-separated
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created', 'closing', 'budget', 'relevance').default('created'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Bid validation schemas
export const bidSchemas = {
  submit: Joi.object({
    rfq_id: Joi.string().uuid().required(),
    amount: Joi.number().min(0).required(),
    timeline_days: Joi.number().integer().min(1).max(730).required(),
    proposal: Joi.string().min(100).max(5000).required(),
    methodology: Joi.string().max(3000).optional(),
    team_info: Joi.string().max(2000).optional(),
    references: Joi.array().items(Joi.object({
      project_name: Joi.string().max(200).required(),
      client_name: Joi.string().max(100).required(),
      contact_email: Joi.string().email().optional(),
      completion_date: Joi.date().max('now').required(),
      value: Joi.number().min(0).optional(),
      description: Joi.string().max(500).optional()
    })).max(5).optional(),
    documents: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().valid('proposal', 'certificate', 'portfolio', 'other').required()
    })).max(10).optional(),
    questions: Joi.array().items(Joi.object({
      question: Joi.string().max(500).required(),
      answer: Joi.string().max(1000).required()
    })).max(20).optional()
  }),

  update: Joi.object({
    amount: Joi.number().min(0).optional(),
    timeline_days: Joi.number().integer().min(1).max(730).optional(),
    proposal: Joi.string().min(100).max(5000).optional(),
    methodology: Joi.string().max(3000).optional(),
    team_info: Joi.string().max(2000).optional(),
    references: Joi.array().items(Joi.object({
      project_name: Joi.string().max(200).required(),
      client_name: Joi.string().max(100).required(),
      contact_email: Joi.string().email().optional(),
      completion_date: Joi.date().max('now').required(),
      value: Joi.number().min(0).optional(),
      description: Joi.string().max(500).optional()
    })).max(5).optional(),
    questions: Joi.array().items(Joi.object({
      question: Joi.string().max(500).required(),
      answer: Joi.string().max(1000).required()
    })).max(20).optional()
  }).min(1),

  evaluate: Joi.object({
    score: Joi.number().min(0).max(100).required(),
    feedback: Joi.string().max(1000).optional(),
    criteria_scores: Joi.object().pattern(
      Joi.string(),
      Joi.number().min(0).max(100)
    ).optional(),
    notes: Joi.string().max(2000).optional()
  })
};

// Template validation schemas
export const templateSchemas = {
  create: Joi.object({
    name: Joi.string().min(5).max(100).required(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().valid(
      'construction', 'consulting', 'maintenance', 'supplies',
      'technology', 'transportation', 'professional-services',
      'healthcare', 'education', 'environmental', 'other'
    ).required(),
    template_data: Joi.object({
      title_template: Joi.string().max(200).optional(),
      description_template: Joi.string().max(5000).optional(),
      default_timeline_days: Joi.number().integer().min(1).max(730).optional(),
      default_skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
      requirements_template: Joi.string().max(2000).optional(),
      deliverables_template: Joi.string().max(2000).optional(),
      evaluation_criteria_template: Joi.string().max(1000).optional(),
      default_questions: Joi.array().items(Joi.string().max(500)).max(10).optional()
    }).required(),
    is_public: Joi.boolean().default(false)
  })
};

// Common validation schemas
export const commonSchemas = {
  id: Joi.object({
    id: Joi.string().uuid().required()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// File upload validation
export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
  const allowedTypes = ['application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'image/jpeg', 'image/png', 'text/plain'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!req.file) {
    next(new ValidationError('File is required'));
    return;
  }

  if (!allowedTypes.includes(req.file.mimetype)) {
    next(new ValidationError('Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG, TXT'));
    return;
  }

  if (req.file.size > maxSize) {
    next(new ValidationError('File size too large. Maximum size is 10MB'));
    return;
  }

  next();
}

// Date validation helpers
export function validateDateRange(startField: string, endField: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startDate = req.body[startField];
    const endDate = req.body[endField];

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      next(new ValidationError(`${endField} must be after ${startField}`));
      return;
    }

    next();
  };
}