import { query, transaction } from '../utils/database';
import { setCache, getCache, invalidateCache } from '../utils/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../middleware/error-handler';

export interface TemplateData {
  name: string;
  description?: string;
  category: string;
  template_data: {
    title_template?: string;
    description_template?: string;
    default_timeline_days?: number;
    default_skills?: string[];
    requirements_template?: string;
    deliverables_template?: string;
    evaluation_criteria_template?: string;
    default_questions?: string[];
  };
  is_public?: boolean;
}

export class TemplateService {
  async createTemplate(templateData: TemplateData, createdBy: string): Promise<any> {
    const templateId = uuidv4();

    const result = await query(
      `INSERT INTO rfq_templates (
        id, created_by, name, description, category, template_data,
        is_public, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        templateId, createdBy, templateData.name, templateData.description,
        templateData.category, JSON.stringify(templateData.template_data),
        templateData.is_public || false
      ]
    );

    // Cache the template
    await setCache(`template:${templateId}`, result.rows[0], 3600);

    return result.rows[0];
  }

  async getTemplateById(templateId: string, userId?: string): Promise<any> {
    // Check cache first
    const cached = await getCache(`template:${templateId}`);
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT t.*, u.email as creator_email
       FROM rfq_templates t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Template not found');
    }

    const template = result.rows[0];

    // Check access permissions
    if (!template.is_public && template.created_by !== userId) {
      throw new ForbiddenError('Access denied to private template');
    }

    // Cache for 1 hour
    await setCache(`template:${templateId}`, template, 3600);

    return template;
  }

  async updateTemplate(templateId: string, updates: Partial<TemplateData>, userId: string): Promise<any> {
    const existing = await this.getTemplateById(templateId, userId);
    
    if (existing.created_by !== userId) {
      throw new ForbiddenError('You can only update your own templates');
    }

    const allowedFields = ['name', 'description', 'template_data', 'is_public'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'template_data') {
          updateFields.push(`template_data = $${paramCount}`);
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
        }
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(templateId);

    const result = await query(
      `UPDATE rfq_templates SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    // Invalidate cache
    await invalidateCache(`template:${templateId}`);

    return result.rows[0];
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const existing = await this.getTemplateById(templateId, userId);
    
    if (existing.created_by !== userId) {
      throw new ForbiddenError('You can only delete your own templates');
    }

    await query(
      `UPDATE rfq_templates SET 
       deleted_at = NOW(),
       updated_at = NOW()
       WHERE id = $1`,
      [templateId]
    );

    // Invalidate cache
    await invalidateCache(`template:${templateId}`);
  }

  async getTemplates(filters: {
    category?: string;
    is_public?: boolean;
    created_by?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const {
      category, is_public, created_by, page = 1, limit = 20
    } = filters;

    let whereConditions = ['t.deleted_at IS NULL'];
    let queryParams: any[] = [];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`t.category = $${paramCount}`);
      queryParams.push(category);
      paramCount++;
    }

    if (is_public !== undefined) {
      whereConditions.push(`t.is_public = $${paramCount}`);
      queryParams.push(is_public);
      paramCount++;
    }

    if (created_by) {
      whereConditions.push(`t.created_by = $${paramCount}`);
      queryParams.push(created_by);
      paramCount++;
    }

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT t.*, u.email as creator_email,
        COUNT(*) OVER() as total_count
       FROM rfq_templates t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    return {
      templates: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getPopularTemplates(category?: string, limit: number = 10): Promise<any[]> {
    let whereClause = 't.is_public = true AND t.deleted_at IS NULL';
    let params: any[] = [];

    if (category) {
      whereClause += ' AND t.category = $1';
      params.push(category);
    }

    const result = await query(
      `SELECT t.*, u.email as creator_email, 
        COUNT(r.id) as usage_count
       FROM rfq_templates t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN rfqs r ON r.template_id = t.id
       WHERE ${whereClause}
       GROUP BY t.id, u.email
       ORDER BY usage_count DESC, t.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return result.rows;
  }

  async duplicateTemplate(templateId: string, userId: string, newName?: string): Promise<any> {
    const original = await this.getTemplateById(templateId, userId);
    
    const templateData = {
      name: newName || `Copy of ${original.name}`,
      description: original.description,
      category: original.category,
      template_data: JSON.parse(original.template_data),
      is_public: false // Always create private copies
    };

    return this.createTemplate(templateData, userId);
  }

  async createRFQFromTemplate(templateId: string, overrides: any, userId: string): Promise<any> {
    const template = await this.getTemplateById(templateId, userId);
    const templateData = JSON.parse(template.template_data);

    // Merge template data with overrides
    const rfqData = {
      title: overrides.title || templateData.title_template || '',
      description: overrides.description || templateData.description_template || '',
      category: template.category,
      timeline_days: overrides.timeline_days || templateData.default_timeline_days || 30,
      skills_required: overrides.skills_required || templateData.default_skills || [],
      requirements: overrides.requirements || templateData.requirements_template || '',
      deliverables: overrides.deliverables || templateData.deliverables_template || '',
      evaluation_criteria: overrides.evaluation_criteria || templateData.evaluation_criteria_template || '',
      ...overrides // Allow any other overrides
    };

    // Call RFQ service to create the actual RFQ
    // This would typically be injected or imported
    // For now, we'll return the prepared data
    return {
      template_id: templateId,
      rfq_data: rfqData,
      default_questions: templateData.default_questions || []
    };
  }

  async getTemplateCategories(): Promise<any[]> {
    const result = await query(
      `SELECT category, COUNT(*) as template_count
       FROM rfq_templates 
       WHERE is_public = true AND deleted_at IS NULL
       GROUP BY category
       ORDER BY template_count DESC, category`,
      []
    );

    return result.rows;
  }

  async getTemplateUsageStats(templateId: string, userId: string): Promise<any> {
    const template = await this.getTemplateById(templateId, userId);
    
    if (template.created_by !== userId) {
      throw new ForbiddenError('You can only view stats for your own templates');
    }

    const result = await query(
      `SELECT 
        COUNT(r.id) as total_rfqs_created,
        COUNT(CASE WHEN r.status = 'open' THEN 1 END) as active_rfqs,
        COUNT(CASE WHEN r.status = 'closed' THEN 1 END) as closed_rfqs,
        COUNT(DISTINCT r.created_by) as unique_users,
        MAX(r.created_at) as last_used,
        AVG((
          SELECT COUNT(*) FROM bids b WHERE b.rfq_id = r.id
        )) as avg_bids_per_rfq
       FROM rfqs r
       WHERE r.template_id = $1`,
      [templateId]
    );

    // Get monthly usage
    const monthlyStats = await query(
      `SELECT 
        DATE_TRUNC('month', r.created_at) as month,
        COUNT(*) as rfqs_created
       FROM rfqs r
       WHERE r.template_id = $1
       AND r.created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', r.created_at)
       ORDER BY month`,
      [templateId]
    );

    return {
      summary: result.rows[0],
      monthly_usage: monthlyStats.rows
    };
  }

  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Construction Project Template',
        description: 'Standard template for construction and infrastructure projects',
        category: 'construction',
        template_data: {
          title_template: '[Project Type] - [Location]',
          description_template: 'We are seeking qualified contractors for [project description]. This project involves [key activities] and must comply with all applicable building codes and safety regulations.',
          default_timeline_days: 90,
          default_skills: ['Construction Management', 'Project Coordination', 'Safety Compliance'],
          requirements_template: '- Valid construction license\n- Minimum 5 years experience\n- Safety certification\n- Bonding and insurance requirements',
          deliverables_template: '- Completed construction as per specifications\n- All permits and inspections\n- Final cleanup and site restoration\n- Warranty documentation',
          evaluation_criteria_template: 'Bids will be evaluated based on:\n- Technical capability (40%)\n- Price competitiveness (30%)\n- Timeline feasibility (20%)\n- Past performance (10%)',
          default_questions: [
            'Please describe your relevant construction experience',
            'What is your proposed project timeline with key milestones?',
            'How do you ensure safety compliance on your projects?'
          ]
        },
        is_public: true
      },
      {
        name: 'Professional Services Template',
        description: 'Template for consulting and professional service engagements',
        category: 'consulting',
        template_data: {
          title_template: '[Service Type] - [Department/Organization]',
          description_template: 'We require professional [service type] services to [project objective]. The successful consultant will provide [key deliverables] and work closely with our team.',
          default_timeline_days: 60,
          default_skills: ['Project Management', 'Industry Expertise', 'Report Writing'],
          requirements_template: '- Relevant professional qualifications\n- Demonstrated expertise in [field]\n- Strong communication skills\n- Ability to work with government stakeholders',
          deliverables_template: '- Comprehensive analysis and recommendations\n- Regular progress reports\n- Final presentation to stakeholders\n- Implementation support',
          evaluation_criteria_template: 'Proposals will be evaluated on:\n- Technical approach and methodology (35%)\n- Qualifications and experience (25%)\n- Cost effectiveness (25%)\n- Understanding of requirements (15%)',
          default_questions: [
            'Describe your methodology for this engagement',
            'What relevant experience do you have in this area?',
            'How will you ensure knowledge transfer to our team?'
          ]
        },
        is_public: true
      },
      {
        name: 'Technology Solutions Template',
        description: 'Template for IT and technology procurement',
        category: 'technology',
        template_data: {
          title_template: '[Technology Solution] Implementation',
          description_template: 'We are seeking a qualified vendor to provide [technology solution]. This includes [scope of work] with ongoing support and maintenance.',
          default_timeline_days: 120,
          default_skills: ['Software Development', 'System Integration', 'Technical Support'],
          requirements_template: '- Proven track record in [technology area]\n- Relevant certifications\n- Local support capabilities\n- Security clearance if required',
          deliverables_template: '- Fully functional system\n- User training and documentation\n- Data migration if applicable\n- Ongoing support agreement',
          evaluation_criteria_template: 'Evaluation criteria:\n- Technical solution quality (40%)\n- Implementation approach (25%)\n- Cost and value (20%)\n- Support and maintenance (15%)',
          default_questions: [
            'Describe your technical approach and architecture',
            'What is your implementation methodology?',
            'How do you handle system integration and data migration?'
          ]
        },
        is_public: true
      }
    ];

    for (const template of defaultTemplates) {
      try {
        await this.createTemplate(template, 'system');
        logger.info(`Created default template: ${template.name}`);
      } catch (error) {
        logger.error(`Failed to create default template ${template.name}:`, error);
      }
    }
  }
}