import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ScheduleHealthCalculator } from './health-calculators/schedule-health.calculator';
import { ProgressHealthCalculator } from './health-calculators/progress-health.calculator';
import { OperationalHealthCalculator } from './health-calculators/operational-health.calculator';
import { EvidenceHealthCalculator } from './health-calculators/evidence-and-quality.calculator';
import { AssessmentScoringService } from './services/assessment-scoring.service';
import { EvidenceAnalyzerService } from './services/evidence-analyzer.service';
import { FollowUpGeneratorService } from './services/followup-generator.service';
import { AssessmentDataDto, HealthCalculationResultDto, ProjectAssessmentResponseDto } from '@common/dto/assessment.dto';
import { HealthStatus } from '@prisma/client';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleHealthCalc: ScheduleHealthCalculator,
    private readonly progressHealthCalc: ProgressHealthCalculator,
    private readonly operationalHealthCalc: OperationalHealthCalculator,
    private readonly evidenceHealthCalc: EvidenceHealthCalculator,
    private readonly scoringService: AssessmentScoringService,
    private readonly evidenceAnalyzer: EvidenceAnalyzerService,
    private readonly followUpGenerator: FollowUpGeneratorService,
  ) {}

  /**
   * Run complete assessment for a project
   */
  async assessProject(projectId: string, asOfDate?: Date): Promise<ProjectAssessmentResponseDto> {
    try {
      // 1. Get project and evidence data
      const assessmentData = await this.gatherAssessmentData(projectId);

      // 2. Run health calculators
      const scheduleResult = this.scheduleHealthCalc.calculate(assessmentData);
      const progressResult = this.progressHealthCalc.calculate(assessmentData);
      const operationalResult = this.operationalHealthCalc.calculate(assessmentData);
      const evidenceResult = this.evidenceHealthCalc.calculateEvidence(assessmentData);
      const qualityResult = this.evidenceHealthCalc.calculateDataQuality(assessmentData);

      // 3. Aggregate results with scoring
      const overallHealth = this.scoringService.aggregateHealthStatus([
        scheduleResult.health,
        progressResult.health,
        operationalResult.health,
        evidenceResult.health,
        qualityResult.health,
      ]);
      const overallConfidence = this.scoringService.aggregateConfidence([
        scheduleResult.confidence,
        progressResult.confidence,
        operationalResult.confidence,
        evidenceResult.confidence,
        qualityResult.confidence,
      ]);

      const allFindings = [
        ...scheduleResult.findings,
        ...progressResult.findings,
        ...operationalResult.findings,
        ...evidenceResult.findings,
      ];

      // 4. Prioritize findings
      const prioritizedFindings = this.scoringService.prioritizeFindings(allFindings);

      const requiresAttention = this.scoringService.requiresAttention(overallHealth);

      // 5. Save assessment to database
      const assessment = await this.prisma.projectAssessment.create({
        data: {
          projectId: assessmentData.projectId,
          asOfDate: asOfDate || new Date(),
          assessmentDate: new Date(),
          scheduleHealth: scheduleResult.health,
          progressHealth: progressResult.health,
          operationalHealth: operationalResult.health,
          evidenceHealth: evidenceResult.health,
          dataQuality: qualityResult.health,
          overallStatus: overallHealth,
          requiresAttention,
          confidenceLevel: overallConfidence,
          summary: this.generateSummary(
            overallHealth,
            prioritizedFindings,
            scheduleResult.explanation,
            progressResult.explanation,
            operationalResult.explanation,
          ),
        },
      });

      // 6. Create findings
      const createdFindings = await Promise.all(
        prioritizedFindings.map((f) =>
          this.prisma.projectFinding.create({
            data: {
              assessmentId: assessment.id,
              category: f.category,
              title: f.title,
              description: f.description,
              severity: f.severity,
              confidence: f.confidence,
              evidenceUpdateIds: f.evidenceUpdateIds,
              evidenceRecordIds: f.evidenceRecordIds,
              reasoning: f.reasoning,
              impact: f.impact,
              recommendedAction: f.recommendedAction,
            },
          }),
        ),
      );

      // 7. Generate follow-ups
      const followUpRecommendations = this.followUpGenerator.generateFollowUps(prioritizedFindings);

      // 8. Create recommended follow-ups for critical findings
      await Promise.all(
        createdFindings
          .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
          .slice(0, 10) // Limit to top 10 actionable items
          .map((finding, index) => {
            const recommendation = followUpRecommendations[index];
            return this.prisma.followUp.create({
              data: {
                projectId: assessmentData.projectId,
                findingId: finding.id,
                title: recommendation?.title || `Action: ${finding.title}`,
                description: recommendation?.description || finding.recommendedAction || finding.description,
                owner: recommendation?.owner || null,
                status: 'OPEN',
                dueDate: recommendation?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          }),
      );

      return {
        id: assessment.id,
        projectId: assessment.projectId,
        asOfDate: assessment.asOfDate,
        assessmentDate: assessment.assessmentDate,
        scheduleHealth: assessment.scheduleHealth,
        progressHealth: assessment.progressHealth,
        operationalHealth: assessment.operationalHealth,
        evidenceHealth: assessment.evidenceHealth,
        dataQuality: assessment.dataQuality,
        overallStatus: assessment.overallStatus,
        requiresAttention: assessment.requiresAttention,
        confidenceLevel: assessment.confidenceLevel,
        summary: assessment.summary || undefined,
        findings: createdFindings.map((f) => ({
          id: f.id,
          category: f.category,
          title: f.title,
          description: f.description,
          severity: f.severity,
          confidence: f.confidence,
          evidenceUpdateIds: f.evidenceUpdateIds,
          evidenceRecordIds: f.evidenceRecordIds,
          reasoning: f.reasoning,
          impact: f.impact,
          recommendedAction: f.recommendedAction,
        })),
      };
    } catch (error) {
      this.logger.error(`Assessment failed for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest assessment for project
   */
  async getLatestAssessment(projectId: string): Promise<ProjectAssessmentResponseDto> {
    const assessment = await this.prisma.projectAssessment.findFirst({
      where: { projectId },
      orderBy: { asOfDate: 'desc' },
      include: {
        findings: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`No assessment found for project ${projectId}`);
    }

    return {
      id: assessment.id,
      projectId: assessment.projectId,
      asOfDate: assessment.asOfDate,
      assessmentDate: assessment.assessmentDate,
      scheduleHealth: assessment.scheduleHealth,
      progressHealth: assessment.progressHealth,
      operationalHealth: assessment.operationalHealth,
      evidenceHealth: assessment.evidenceHealth,
      dataQuality: assessment.dataQuality,
      overallStatus: assessment.overallStatus,
      requiresAttention: assessment.requiresAttention,
      confidenceLevel: assessment.confidenceLevel,
      summary: assessment.summary || undefined,
      findings: assessment.findings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        description: f.description,
        severity: f.severity,
        confidence: f.confidence,
        evidenceUpdateIds: f.evidenceUpdateIds,
        evidenceRecordIds: f.evidenceRecordIds,
        reasoning: f.reasoning,
        impact: f.impact,
        recommendedAction: f.recommendedAction,
      })),
    };
  }

  /**
   * Get assessment history for project
   */
  async getAssessmentHistory(projectId: string, limit: number = 10): Promise<ProjectAssessmentResponseDto[]> {
    const assessments = await this.prisma.projectAssessment.findMany({
      where: { projectId },
      orderBy: { asOfDate: 'desc' },
      take: limit,
      include: {
        findings: true,
      },
    });

    return assessments.map((assessment) => ({
      id: assessment.id,
      projectId: assessment.projectId,
      asOfDate: assessment.asOfDate,
      assessmentDate: assessment.assessmentDate,
      scheduleHealth: assessment.scheduleHealth,
      progressHealth: assessment.progressHealth,
      operationalHealth: assessment.operationalHealth,
      evidenceHealth: assessment.evidenceHealth,
      dataQuality: assessment.dataQuality,
      overallStatus: assessment.overallStatus,
      requiresAttention: assessment.requiresAttention,
      confidenceLevel: assessment.confidenceLevel,
      summary: assessment.summary || undefined,
      findings: assessment.findings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        description: f.description,
        severity: f.severity,
        confidence: f.confidence,
        evidenceUpdateIds: f.evidenceUpdateIds,
        evidenceRecordIds: f.evidenceRecordIds,
        reasoning: f.reasoning,
        impact: f.impact,
        recommendedAction: f.recommendedAction,
      })),
    }));
  }

  /**
   * Get follow-up recommendations for project
   */
  async getFollowUpRecommendations(projectId: string): Promise<any> {
    const followups = await this.prisma.followUp.findMany({
      where: {
        projectId,
        status: 'OPEN',
      },
      orderBy: { dueDate: 'asc' },
      include: {
        finding: true,
      },
    });

    const critical = followups.filter((f) => f.finding?.severity === 'CRITICAL').length;
    const high = followups.filter((f) => f.finding?.severity === 'HIGH').length;

    return {
      total: followups.length,
      critical,
      high,
      items: followups.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        owner: f.owner,
        status: f.status,
        dueDate: f.dueDate,
        severity: f.finding?.severity,
      })),
    };
  }

  /**
   * Get dashboard summary for all projects
   */
  async getDashboardSummary(): Promise<any> {
    const latestAssessments = await this.prisma.projectAssessment.findMany({
      distinct: ['projectId'],
      orderBy: { asOfDate: 'desc' },
      include: {
        project: true,
      },
    });

    const statusCounts = {
      HEALTHY: 0,
      AT_RISK: 0,
      NEEDS_ATTENTION: 0,
      INSUFFICIENT_DATA: 0,
    };

    const projects = [];

    for (const assessment of latestAssessments) {
      statusCounts[assessment.overallStatus]++;
      projects.push({
        projectId: assessment.projectId,
        projectName: assessment.project?.projectName,
        status: assessment.overallStatus,
        requiresAttention: assessment.requiresAttention,
        asOfDate: assessment.asOfDate,
        findingsCount: await this.prisma.projectFinding.count({
          where: { assessmentId: assessment.id },
        }),
      });
    }

    const criticalCount = await this.prisma.followUp.count({
      where: {
        status: 'OPEN',
        finding: {
          severity: 'CRITICAL',
        },
      },
    });

    return {
      timestamp: new Date(),
      summary: {
        totalProjects: projects.length,
        healthyProjects: statusCounts.HEALTHY,
        atRiskProjects: statusCounts.AT_RISK,
        needsAttentionProjects: statusCounts.NEEDS_ATTENTION,
        insufficientDataProjects: statusCounts.INSUFFICIENT_DATA,
        criticalFollowUps: criticalCount,
      },
      projects: projects.slice(0, 20), // Top 20
    };
  }

  /**
   * Gather all evidence data for assessment
   */
  private async gatherAssessmentData(projectId: string): Promise<AssessmentDataDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const updates = await this.prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { timestamp: 'asc' },
    });

    const records = await this.prisma.productionRecord.findMany({
      where: { projectId },
      orderBy: { timestamp: 'asc' },
    });

    return {
      projectId,
      project: {
        projectName: project.projectName,
        startDate: project.startDate,
        deadline: project.deadline,
        target: project.target,
        targetUnit: project.targetUnit,
        reportedActual: project.reportedActual?.toNumber(),
        reportedProgressPct: project.reportedProgressPct?.toNumber(),
        reportedStatus: project.reportedStatus,
        lastReportedUpdateAt: project.lastReportedUpdateAt,
      },
      updates: updates.map((u) => ({
        updateId: u.updateId,
        timestamp: u.timestamp,
        sourceType: u.sourceType,
        sourceName: u.sourceName,
        message: u.message,
      })),
      productionRecords: records.map((r) => ({
        sourceRecordId: r.sourceRecordId,
        recordType: r.recordType,
        timestamp: r.timestamp,
        payload: r.payload,
      })),
    };
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    overallHealth: HealthStatus,
    findings: any[],
    ...explanations: string[]
  ): string {
    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;

    return `
Project Status: ${overallHealth}

Summary:
- ${criticalCount} critical findings
- ${highCount} high-severity findings  
- Total ${findings.length} findings identified

${explanations.join('\n')}

${overallHealth === HealthStatus.NEEDS_ATTENTION ? 'IMMEDIATE ACTION REQUIRED' : 'Continue monitoring'}
    `.trim();
  }
}
