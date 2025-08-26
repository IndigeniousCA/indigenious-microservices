import { PrismaClient, EvaluationType, EvaluationStatus, EvaluationStage } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ScoringService } from './scoring.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

// Validation schemas
const EvaluationCreateSchema = z.object({
  rfqId: z.string(),
  rfqTitle: z.string(),
  evaluationType: z.enum(['TECHNICAL', 'FINANCIAL', 'COMBINED', 'TWO_ENVELOPE', 'QUALITY_BASED', 'INDIGENOUS_PREFERRED']),
  criteriaSetId: z.string().optional(),
  communityWeightings: z.record(z.number()).optional(),
  indigenousRequirement: z.number().min(0).max(100).optional(),
  localPreference: z.number().min(0).optional(),
  blindMode: z.boolean().default(false),
  consensusRequired: z.boolean().default(false),
  minimumEvaluators: z.number().min(1).default(3),
  passingScore: z.number().min(0).max(100).default(70),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  createdBy: z.string()
});

export class EvaluationService {
  private static readonly CACHE_PREFIX = 'evaluation:';
  private static readonly CACHE_TTL = 3600;

  /**
   * Create new evaluation
   */
  static async createEvaluation(data: z.infer<typeof EvaluationCreateSchema>) {
    const validated = EvaluationCreateSchema.parse(data);

    // Get or create criteria set
    let criteriaSetId = validated.criteriaSetId;
    if (!criteriaSetId) {
      criteriaSetId = await this.getDefaultCriteriaSet(validated.evaluationType);
    }

    // Validate community weightings if provided
    if (validated.communityWeightings) {
      this.validateWeightings(validated.communityWeightings);
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        ...validated,
        criteriaSetId,
        status: 'DRAFT',
        stage: 'SETUP',
        totalSubmissions: 0,
        evaluatedSubmissions: 0,
        methodology: this.determineMethodology(validated.evaluationType),
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : undefined
      },
      include: {
        criteriaSet: {
          include: {
            criteria: true
          }
        }
      }
    });

    // Initialize evaluation workflow
    await this.initializeWorkflow(evaluation);

    // Emit event
    eventEmitter.emit('evaluation:created', evaluation);

    return evaluation;
  }

  /**
   * Register submissions for evaluation
   */
  static async registerSubmissions(evaluationId: string, submissions: Array<{
    submissionId: string;
    vendorId: string;
    vendorName: string;
    submissionDate: string;
    isIndigenousBusiness: boolean;
    indigenousOwnership?: number;
    bandAffiliation?: string;
    localDistance?: number;
  }>) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    if (evaluation.status !== 'DRAFT' && evaluation.status !== 'IN_PROGRESS') {
      throw new Error('Cannot add submissions to completed evaluation');
    }

    const submissionEvaluations = [];

    for (const submission of submissions) {
      const submissionEval = await prisma.submissionEvaluation.create({
        data: {
          evaluationId,
          submissionId: submission.submissionId,
          vendorId: submission.vendorId,
          vendorName: submission.vendorName,
          submissionDate: new Date(submission.submissionDate),
          isIndigenousBusiness: submission.isIndigenousBusiness,
          indigenousOwnership: submission.indigenousOwnership,
          bandAffiliation: submission.bandAffiliation,
          localDistance: submission.localDistance,
          status: 'PENDING'
        }
      });

      submissionEvaluations.push(submissionEval);
    }

    // Update evaluation
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        totalSubmissions: { increment: submissions.length },
        status: 'IN_PROGRESS',
        stage: 'PRELIMINARY_REVIEW'
      }
    });

    return {
      registered: submissionEvaluations.length,
      evaluationId,
      status: 'ready_for_evaluation'
    };
  }

  /**
   * Assign evaluators to evaluation
   */
  static async assignEvaluators(evaluationId: string, evaluators: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    expertise: string[];
    isIndigenous?: boolean;
    bandAffiliation?: string;
  }>) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        submissions: true
      }
    });

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // Check minimum evaluators
    if (evaluators.length < evaluation.minimumEvaluators) {
      throw new Error(`Minimum ${evaluation.minimumEvaluators} evaluators required`);
    }

    // Check for Indigenous representation if required
    if (evaluation.evaluationType === 'INDIGENOUS_PREFERRED') {
      const indigenousEvaluators = evaluators.filter(e => e.isIndigenous);
      if (indigenousEvaluators.length === 0) {
        throw new Error('At least one Indigenous evaluator required for this evaluation type');
      }
    }

    const assignedEvaluators = [];

    for (const evaluator of evaluators) {
      // Assign submissions to evaluator
      const assignedSubmissions = evaluation.blindMode
        ? this.blindAssignSubmissions(evaluation.submissions)
        : evaluation.submissions.map(s => s.id);

      const assigned = await prisma.evaluator.create({
        data: {
          evaluationId,
          userId: evaluator.userId,
          name: evaluator.name,
          email: evaluator.email,
          role: evaluator.role as any,
          expertise: evaluator.expertise,
          isIndigenous: evaluator.isIndigenous || false,
          bandAffiliation: evaluator.bandAffiliation,
          assignedSubmissions,
          completedSubmissions: [],
          isLead: evaluator.role === 'LEAD_EVALUATOR'
        }
      });

      assignedEvaluators.push(assigned);

      // Check for conflicts of interest
      await this.checkConflictsOfInterest(assigned);
    }

    // Update evaluation stage
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        stage: 'DETAILED_EVALUATION'
      }
    });

    return {
      assigned: assignedEvaluators.length,
      evaluators: assignedEvaluators,
      nextStep: 'begin_evaluation'
    };
  }

  /**
   * Submit evaluation scores
   */
  static async submitEvaluation(
    evaluatorId: string,
    submissionId: string,
    evaluation: {
      scores: Array<{
        criterionId: string;
        score: number;
        justification: string;
        evidence: string[];
      }>;
      overallComments: string;
      strengths: string[];
      concerns: string[];
      recommendations: string[];
      wouldRecommend: boolean;
      riskAssessment?: string;
    }
  ) {
    // Verify evaluator assignment
    const evaluator = await prisma.evaluator.findFirst({
      where: {
        id: evaluatorId,
        assignedSubmissions: { has: submissionId }
      }
    });

    if (!evaluator) {
      throw new Error('Evaluator not assigned to this submission');
    }

    // Check if already evaluated
    if (evaluator.completedSubmissions.includes(submissionId)) {
      throw new Error('Submission already evaluated by this evaluator');
    }

    // Submit scores
    const result = evaluator.isBlind
      ? await ScoringService.performBlindEvaluation(
          evaluatorId,
          submissionId,
          evaluation.scores
        )
      : await this.submitRegularEvaluation(
          evaluatorId,
          submissionId,
          evaluation
        );

    // Update evaluator progress
    await prisma.evaluator.update({
      where: { id: evaluatorId },
      data: {
        completedSubmissions: {
          push: submissionId
        }
      }
    });

    // Check if submission fully evaluated
    await this.checkSubmissionComplete(submissionId);

    return result;
  }

  /**
   * Finalize evaluation
   */
  static async finalizeEvaluation(evaluationId: string, approvedBy?: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        submissions: true,
        evaluators: true
      }
    });

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // Check all submissions evaluated
    const pendingSubmissions = evaluation.submissions.filter(
      s => s.status === 'PENDING' || s.status === 'UNDER_EVALUATION'
    );

    if (pendingSubmissions.length > 0) {
      throw new Error(`${pendingSubmissions.length} submissions still pending evaluation`);
    }

    // Build consensus if required
    if (evaluation.consensusRequired) {
      for (const submission of evaluation.submissions) {
        const evaluatorIds = evaluation.evaluators.map(e => e.id);
        await ScoringService.buildConsensus(
          evaluationId,
          submission.id,
          evaluatorIds
        );
      }
    }

    // Calculate final scores
    for (const submission of evaluation.submissions) {
      const score = await ScoringService.calculateWeightedScore(
        submission.id,
        evaluationId
      );

      // Apply Indigenous preferences
      if (evaluation.indigenousRequirement || evaluation.communityWeightings) {
        const preferences = await ScoringService.applyIndigenousPreferences(
          submission.id,
          {
            indigenousOwnership: evaluation.indigenousRequirement || undefined,
            localPreference: evaluation.localPreference || undefined,
            bandAffiliation: submission.bandAffiliation || undefined
          }
        );

        // Add Indigenous bonus to final score
        score.finalScore = Math.min(100, score.finalScore + (preferences.totalScore * 0.2));
      }

      await prisma.submissionEvaluation.update({
        where: { id: submission.id },
        data: {
          totalScore: score.finalScore,
          normalizedScore: score.finalScore,
          priceScore: score.categoryBreakdown.PRICE,
          technicalScore: score.categoryBreakdown.TECHNICAL,
          indigenousScore: score.categoryBreakdown.INDIGENOUS_CONTENT,
          sustainabilityScore: score.categoryBreakdown.SUSTAINABILITY,
          innovationScore: score.categoryBreakdown.INNOVATION,
          status: 'EVALUATED'
        }
      });
    }

    // Rank submissions
    const rankings = await ScoringService.rankSubmissions(evaluationId);

    // Update evaluation
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'COMPLETED',
        stage: 'CLOSED',
        completedAt: new Date(),
        approvedBy,
        approvalDate: approvedBy ? new Date() : undefined
      }
    });

    // Generate report
    const report = await this.generateEvaluationReport(evaluationId);

    // Emit completion event
    eventEmitter.emit('evaluation:completed', {
      evaluationId,
      rankings: rankings.rankings,
      report
    });

    return {
      status: 'completed',
      rankings: rankings.rankings,
      report,
      winner: rankings.rankings.find(r => r.rank === 1)
    };
  }

  /**
   * Generate evaluation report
   */
  static async generateEvaluationReport(evaluationId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        submissions: {
          orderBy: { rank: 'asc' }
        },
        evaluators: true,
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    const report = {
      evaluationId,
      rfqTitle: evaluation.rfqTitle,
      evaluationType: evaluation.evaluationType,
      completedDate: evaluation.completedAt,
      summary: {
        totalSubmissions: evaluation.totalSubmissions,
        evaluatedSubmissions: evaluation.evaluatedSubmissions,
        averageScore: evaluation.averageScore,
        winningScore: evaluation.winningScore,
        passingSubmissions: evaluation.submissions.filter(s => s.totalScore! >= evaluation.passingScore).length,
        indigenousWinners: evaluation.submissions.filter(s => s.isIndigenousBusiness && s.rank && s.rank <= 3).length
      },
      methodology: {
        type: evaluation.methodology,
        blindMode: evaluation.blindMode,
        consensusRequired: evaluation.consensusRequired,
        indigenousRequirement: evaluation.indigenousRequirement,
        localPreference: evaluation.localPreference
      },
      rankings: evaluation.submissions.map(s => ({
        rank: s.rank,
        vendor: evaluation.blindMode ? `Vendor ${s.rank}` : s.vendorName,
        score: s.totalScore,
        isIndigenous: s.isIndigenousBusiness,
        indigenousOwnership: s.indigenousOwnership,
        status: s.status
      })),
      evaluators: evaluation.evaluators.map(e => ({
        name: e.name,
        role: e.role,
        completedEvaluations: e.completedSubmissions.length,
        averageScore: e.averageScoreGiven
      })),
      timeline: {
        created: evaluation.createdAt,
        started: evaluation.startDate,
        completed: evaluation.completedAt,
        duration: evaluation.completedAt 
          ? Math.ceil((evaluation.completedAt.getTime() - evaluation.startDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      },
      auditTrail: evaluation.auditLogs.length
    };

    // Store report
    await redis.setex(
      `report:${evaluationId}`,
      86400 * 30, // 30 days
      JSON.stringify(report)
    );

    return report;
  }

  // Helper methods
  private static async getDefaultCriteriaSet(evaluationType: EvaluationType): Promise<string> {
    const defaultSet = await prisma.evaluationCriteriaSet.findFirst({
      where: {
        isDefault: true,
        category: evaluationType
      }
    });

    if (!defaultSet) {
      // Create default set
      const newSet = await prisma.evaluationCriteriaSet.create({
        data: {
          name: `Default ${evaluationType} Criteria`,
          category: evaluationType,
          isDefault: true,
          scoringMethod: 'WEIGHTED_AVERAGE',
          indigenousWeight: 20,
          sustainabilityWeight: 10,
          localContentWeight: 10,
          innovationWeight: 5
        }
      });

      // Add default criteria
      await this.createDefaultCriteria(newSet.id, evaluationType);

      return newSet.id;
    }

    return defaultSet.id;
  }

  private static async createDefaultCriteria(criteriaSetId: string, evaluationType: string) {
    const defaultCriteria = [
      {
        name: 'Price',
        category: 'PRICE' as any,
        weight: 30,
        isMandatory: true
      },
      {
        name: 'Technical Capability',
        category: 'TECHNICAL' as any,
        weight: 25,
        isMandatory: true
      },
      {
        name: 'Experience',
        category: 'EXPERIENCE' as any,
        weight: 20,
        isMandatory: false
      },
      {
        name: 'Indigenous Content',
        category: 'INDIGENOUS_CONTENT' as any,
        weight: 15,
        indigenousRelevance: true
      },
      {
        name: 'Local Content',
        category: 'LOCAL_CONTENT' as any,
        weight: 5,
        communityImpact: true
      },
      {
        name: 'Innovation',
        category: 'INNOVATION' as any,
        weight: 5,
        isMandatory: false
      }
    ];

    for (let i = 0; i < defaultCriteria.length; i++) {
      await prisma.evaluationCriterion.create({
        data: {
          criteriaSetId,
          ...defaultCriteria[i],
          description: `Evaluation of ${defaultCriteria[i].name}`,
          maxScore: 100,
          scoringType: 'NUMERIC',
          evidenceRequired: [],
          evaluationQuestions: [],
          displayOrder: i + 1
        }
      });
    }
  }

  private static validateWeightings(weightings: Record<string, number>) {
    const total = Object.values(weightings).reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error('Community weightings must sum to 100%');
    }
  }

  private static determineMethodology(evaluationType: EvaluationType): string {
    switch (evaluationType) {
      case 'TECHNICAL':
        return 'Technical evaluation only';
      case 'FINANCIAL':
        return 'Financial evaluation only';
      case 'TWO_ENVELOPE':
        return 'Two-envelope system (technical then financial)';
      case 'QUALITY_BASED':
        return 'Quality and cost-based selection';
      case 'INDIGENOUS_PREFERRED':
        return 'Indigenous procurement preferences applied';
      case 'COMBINED':
      default:
        return 'Combined technical and financial evaluation';
    }
  }

  private static async initializeWorkflow(evaluation: any) {
    // Create workflow tasks
    await prisma.evaluationAudit.create({
      data: {
        evaluationId: evaluation.id,
        action: 'CREATE',
        entityType: 'EVALUATION',
        entityId: evaluation.id,
        userId: evaluation.createdBy,
        userName: 'System',
        newValue: { status: 'initialized' }
      }
    });
  }

  private static blindAssignSubmissions(submissions: any[]): string[] {
    // Shuffle and assign without vendor identification
    const shuffled = [...submissions].sort(() => Math.random() - 0.5);
    return shuffled.map(s => s.id);
  }

  private static async checkConflictsOfInterest(evaluator: any) {
    // Check for potential conflicts
    // In production, would check against vendor relationships
    const conflicts = [];

    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        await prisma.conflictOfInterest.create({
          data: conflict
        });
      }
    }
  }

  private static async submitRegularEvaluation(
    evaluatorId: string,
    submissionId: string,
    evaluation: any
  ): Promise<any> {
    // Create evaluator score
    const evaluatorScore = await prisma.evaluatorScore.create({
      data: {
        submissionEvalId: submissionId,
        evaluatorId,
        overallScore: 0, // Will calculate
        confidence: 0.85,
        comments: evaluation.overallComments,
        strengths: evaluation.strengths,
        concerns: evaluation.concerns,
        recommendations: evaluation.recommendations,
        wouldRecommend: evaluation.wouldRecommend,
        riskAssessment: evaluation.riskAssessment as any,
        completedAt: new Date()
      }
    });

    // Record criterion scores
    let totalScore = 0;
    for (const score of evaluation.scores) {
      const criterion = await prisma.evaluationCriterion.findUnique({
        where: { id: score.criterionId }
      });

      if (!criterion) continue;

      const normalizedScore = (score.score / criterion.maxScore) * 100;
      const weightedScore = normalizedScore * (criterion.weight / 100);
      totalScore += weightedScore;

      await prisma.criterionScore.create({
        data: {
          submissionEvalId: submissionId,
          criterionId: score.criterionId,
          evaluatorScoreId: evaluatorScore.id,
          score: score.score,
          maxScore: criterion.maxScore,
          normalizedScore,
          weight: criterion.weight,
          weightedScore,
          justification: score.justification,
          evidence: score.evidence,
          strengthsNoted: [],
          improvementAreas: [],
          isMandatory: criterion.isMandatory,
          passed: criterion.isMandatory 
            ? score.score >= (criterion.minimumScore || 0)
            : true
        }
      });
    }

    // Update evaluator score with total
    await prisma.evaluatorScore.update({
      where: { id: evaluatorScore.id },
      data: { overallScore: totalScore }
    });

    return {
      evaluatorScoreId: evaluatorScore.id,
      overallScore: totalScore,
      status: 'submitted'
    };
  }

  private static async checkSubmissionComplete(submissionId: string) {
    const submission = await prisma.submissionEvaluation.findUnique({
      where: { id: submissionId },
      include: {
        evaluation: {
          include: {
            evaluators: true
          }
        }
      }
    });

    if (!submission) return;

    const requiredEvaluators = submission.evaluation.minimumEvaluators;
    const completedEvaluators = submission.evaluation.evaluators.filter(
      e => e.completedSubmissions.includes(submissionId)
    ).length;

    if (completedEvaluators >= requiredEvaluators) {
      await prisma.submissionEvaluation.update({
        where: { id: submissionId },
        data: {
          status: 'EVALUATED',
          completedEvaluations: completedEvaluators,
          lastEvaluatedAt: new Date()
        }
      });

      // Check if all submissions complete
      await this.checkEvaluationComplete(submission.evaluationId);
    }
  }

  private static async checkEvaluationComplete(evaluationId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        submissions: true
      }
    });

    if (!evaluation) return;

    const completed = evaluation.submissions.filter(
      s => s.status === 'EVALUATED'
    ).length;

    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        evaluatedSubmissions: completed
      }
    });

    if (completed === evaluation.totalSubmissions) {
      await prisma.evaluation.update({
        where: { id: evaluationId },
        data: {
          stage: 'FINAL_SCORING'
        }
      });

      eventEmitter.emit('evaluation:ready_for_finalization', evaluationId);
    }
  }
}