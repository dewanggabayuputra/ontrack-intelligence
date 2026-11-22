import { Injectable, Logger } from '@nestjs/common';
import { AssessmentDataDto, HealthCalculationResultDto, HealthFindingDto } from '@common/dto/assessment.dto';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

/**
 * Progress Health Calculator
 * Evaluates: Completion percentage, velocity, milestone achievement
 */
@Injectable()
export class ProgressHealthCalculator {
  private readonly logger = new Logger(ProgressHealthCalculator.name);

  /**
   * Calculate progress health based on:
   * - Reported progress percentage
   * - Progress trend
   * - Milestone tracking
   */
  calculate(data: AssessmentDataDto): HealthCalculationResultDto {
    const findings: HealthFindingDto[] = [];
    let health: HealthStatus = HealthStatus.HEALTHY;
    let confidence: Confidence = Confidence.HIGH;

    try {
      const project = data.project;

      // Check 1: Progress percentage
      if (project.reportedProgressPct === undefined || project.reportedProgressPct === null) {
        findings.push({
          category: 'PROGRESS',
          title: 'No Progress Data',
          description: 'Project progress percentage not reported',
          severity: Severity.MEDIUM,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Cannot assess project completion status',
          impact: 'Progress visibility is critical for project health',
        });
        health = HealthStatus.INSUFFICIENT_DATA;
        confidence = Confidence.LOW;
      } else {
        const progress = project.reportedProgressPct;

        if (progress < 0 || progress > 100) {
          findings.push({
            category: 'PROGRESS',
            title: 'Invalid Progress Data',
            description: `Reported progress: ${progress}% (should be 0-100)`,
            severity: Severity.HIGH,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'Progress data is invalid or corrupted',
            impact: 'Cannot trust progress metrics',
          });
          health = HealthStatus.NEEDS_ATTENTION;
        } else if (progress === 0) {
          findings.push({
            category: 'PROGRESS',
            title: 'No Progress Made',
            description: 'Project progress is 0%',
            severity: Severity.CRITICAL,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'No work has been completed',
            impact: 'Project appears not to have started',
            recommendedAction: 'Investigate project status immediately',
          });
          health = HealthStatus.NEEDS_ATTENTION;
        } else if (progress < 25) {
          findings.push({
            category: 'PROGRESS',
            title: 'Very Low Progress',
            description: `Project is only ${progress}% complete`,
            severity: Severity.HIGH,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'Significant work remains with uncertain timeline',
            impact: 'High risk of deadline miss',
            recommendedAction: 'Review blockers and resource allocation',
          });
          health = HealthStatus.AT_RISK;
        } else if (progress >= 100) {
          findings.push({
            category: 'PROGRESS',
            title: 'Project Complete',
            description: `Project is ${progress}% complete`,
            severity: Severity.LOW,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'All planned work is done',
          });
          health = HealthStatus.HEALTHY;
        } else if (progress >= 75) {
          health = HealthStatus.HEALTHY;
        }
      }

      // Check 2: Progress trend
      if (data.updates.length >= 2) {
        const recentUpdates = data.updates
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 3);

        // Simple trend: check if progress is stalling
        const messageTexts = recentUpdates.map((u) => u.message.toLowerCase());
        const stallKeywords = ['stuck', 'blocked', 'waiting', 'hold', 'delay', 'postpone'];
        const hasStallIndication = messageTexts.some((text) =>
          stallKeywords.some((keyword) => text.includes(keyword)),
        );

        if (hasStallIndication) {
          findings.push({
            category: 'PROGRESS',
            title: 'Progress Stalling',
            description: 'Recent updates indicate blocked or stalled progress',
            severity: Severity.MEDIUM,
            confidence: Confidence.MEDIUM,
            evidenceUpdateIds: recentUpdates.map((u) => u.updateId),
            evidenceRecordIds: [],
            reasoning: 'Project reports indicate blockers or delays',
            impact: 'Risk of extended delays',
            recommendedAction: 'Identify and resolve blockers immediately',
          });
          health = HealthStatus.AT_RISK;
        }
      }

      // Link remaining evidence
      findings.forEach((f) => {
        if (f.evidenceUpdateIds.length === 0) {
          f.evidenceUpdateIds = data.updates.map((u) => u.updateId);
        }
      });
    } catch (error) {
      this.logger.error('Progress health calculation error:', error);
      health = HealthStatus.INSUFFICIENT_DATA;
      confidence = Confidence.LOW;
    }

    return {
      health,
      confidence,
      findings,
      explanation: `Progress health: ${health}. ${findings.length} findings. Based on completion percentage and trend analysis.`,
    };
  }
}
