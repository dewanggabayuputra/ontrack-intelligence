import { Injectable, Logger } from '@nestjs/common';
import { AssessmentDataDto, HealthCalculationResultDto, HealthFindingDto } from '@common/dto/assessment.dto';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

/**
 * Evidence Health Calculator
 * Evaluates: Data completeness, freshness, consistency
 */
@Injectable()
export class EvidenceHealthCalculator {
  private readonly logger = new Logger(EvidenceHealthCalculator.name);

  /**
   * Calculate evidence health based on:
   * - Data completeness
   * - Update frequency
   * - Data consistency
   */
  calculateEvidence(data: AssessmentDataDto): HealthCalculationResultDto {
    const findings: HealthFindingDto[] = [];
    let health: HealthStatus = HealthStatus.HEALTHY;
    let confidence: Confidence = Confidence.HIGH;

    try {
      const now = new Date();
      const project = data.project;

      // Check 1: Data Completeness
      const completenessScore = this.calculateCompleteness(project);
      if (completenessScore < 50) {
        findings.push({
          category: 'EVIDENCE',
          title: 'Incomplete Master Data',
          description: `Master data completeness: ${completenessScore}%`,
          severity: Severity.MEDIUM,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Critical project fields are missing',
          impact: 'Assessment may be incomplete or inaccurate',
        });
        health = HealthStatus.AT_RISK;
      }

      // Check 2: Update Freshness
      const latestUpdate = [...data.updates].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];
      const latestUpdateIsNewer = Boolean(
        latestUpdate &&
          (!project.lastReportedUpdateAt ||
            latestUpdate.timestamp.getTime() >= project.lastReportedUpdateAt.getTime()),
      );
      const lastUpdateAt =
        latestUpdateIsNewer && latestUpdate ? latestUpdate.timestamp : project.lastReportedUpdateAt;

      if (lastUpdateAt) {
        const hoursOld = (now.getTime() - lastUpdateAt.getTime()) / (1000 * 60 * 60);

        if (hoursOld > 7 * 24) {
          // More than 7 days
          findings.push({
            category: 'EVIDENCE',
            title: 'Stale Updates',
            description: `Last update: ${Math.floor(hoursOld / 24)} days ago`,
            severity: Severity.MEDIUM,
            confidence: Confidence.HIGH,
            evidenceUpdateIds:
              latestUpdateIsNewer && latestUpdate ? [latestUpdate.updateId] : [],
            evidenceRecordIds: [],
            reasoning: 'Status information is outdated',
            impact: 'Assessment based on potentially outdated information',
            recommendedAction: 'Request fresh status update from project team',
          });
          health = HealthStatus.AT_RISK;
        } else if (hoursOld > 2 * 24) {
          // More than 2 days
          findings.push({
            category: 'EVIDENCE',
            title: 'Updates Could Be Fresher',
            description: `Last update: ${Math.floor(hoursOld / 24)} days ago`,
            severity: Severity.LOW,
            confidence: Confidence.MEDIUM,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'Information is recent but could be more current',
          });
        }
      }

      // Check 3: Data Consistency
      if (project.reportedProgressPct !== undefined && project.reportedActual !== undefined) {
        // If actual completion can be calculated from target
        if (project.target && project.targetUnit) {
          // Could validate consistency between reportedProgressPct and reportedActual
          // This is domain-specific and depends on target definition
        }
      }

      // Check 4: Update Frequency
      if (data.updates.length === 0) {
        findings.push({
          category: 'EVIDENCE',
          title: 'No Status Updates',
          description: 'Project has no status updates',
          severity: Severity.HIGH,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Cannot assess project status without updates',
          impact: 'Assessment confidence is very low',
        });
        health = HealthStatus.INSUFFICIENT_DATA;
        confidence = Confidence.LOW;
      } else if (data.updates.length < 2) {
        findings.push({
          category: 'EVIDENCE',
          title: 'Very Limited Updates',
          description: 'Project has only 1 status update',
          severity: Severity.MEDIUM,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: data.updates.map((u) => u.updateId),
          evidenceRecordIds: [],
          reasoning: 'Insufficient data points for trend analysis',
          impact: 'Cannot assess project progress trends',
        });
        confidence = Confidence.MEDIUM;
      }

      if (findings.length === 0) {
        health = HealthStatus.HEALTHY;
      }
    } catch (error) {
      this.logger.error('Evidence health calculation error:', error);
      health = HealthStatus.INSUFFICIENT_DATA;
      confidence = Confidence.LOW;
    }

    return {
      health,
      confidence,
      findings,
      explanation: `Evidence health: ${health}. ${findings.length} findings. Based on data completeness and freshness.`,
    };
  }

  /**
   * Calculate data quality
   * Same logic as evidence, focusing on assessment confidence
   */
  calculateDataQuality(data: AssessmentDataDto): HealthCalculationResultDto {
    const evidenceHealth = this.calculateEvidence(data);

    return {
      health: evidenceHealth.health,
      confidence: evidenceHealth.confidence,
      findings: [
        ...evidenceHealth.findings.map((f) => ({
          ...f,
          category: 'DATA_QUALITY',
        })),
      ],
      explanation: `Data quality: ${evidenceHealth.health}. Assessment data quality directly impacts confidence in results.`,
    };
  }

  /**
   * Calculate percentage of required fields present
   */
  private calculateCompleteness(project: any): number {
    const requiredFields = [
      'projectName',
      'startDate',
      'deadline',
      'reportedProgressPct',
      'reportedStatus',
    ];

    const presentFields = requiredFields.filter((field) => project[field] !== undefined && project[field] !== null);

    return (presentFields.length / requiredFields.length) * 100;
  }
}
