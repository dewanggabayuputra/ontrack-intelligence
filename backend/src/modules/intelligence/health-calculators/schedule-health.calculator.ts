import { Injectable, Logger } from '@nestjs/common';
import { AssessmentDataDto, HealthCalculationResultDto, HealthFindingDto } from '@common/dto/assessment.dto';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

const PROGRESS_VARIANCE_TOLERANCE_PCT = 5;

/**
 * Schedule Health Calculator
 * Evaluates: Start date, deadline, progress vs timeline
 */
@Injectable()
export class ScheduleHealthCalculator {
  private readonly logger = new Logger(ScheduleHealthCalculator.name);

  /**
   * Calculate schedule health based on:
   * - Deadline vs today
   * - Progress reported
   * - Timeline adherence
   */
  calculate(data: AssessmentDataDto): HealthCalculationResultDto {
    const findings: HealthFindingDto[] = [];
    let health: HealthStatus = HealthStatus.HEALTHY;
    let confidence: Confidence = Confidence.HIGH;

    try {
      const project = data.project;
      const now = new Date();

      // Check 1: Deadline approaching
      if (project.deadline) {
        const daysUntilDeadline = this.daysBetween(now, project.deadline);
        const projectDuration = project.startDate
          ? this.daysBetween(project.startDate, project.deadline)
          : null;

        if (daysUntilDeadline < 0) {
          // Deadline passed
          findings.push({
            category: 'SCHEDULE',
            title: 'Deadline Passed',
            description: `Project deadline was ${Math.abs(daysUntilDeadline)} days ago (${project.deadline.toISOString()})`,
            severity: Severity.CRITICAL,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'Project deadline has passed without completion',
            impact: 'Severe project delay',
            recommendedAction: 'Immediate escalation required',
          });
          health = HealthStatus.NEEDS_ATTENTION;
        } else if (daysUntilDeadline < 14) {
          // Deadline within 2 weeks
          findings.push({
            category: 'SCHEDULE',
            title: 'Deadline Critical',
            description: `Project deadline in ${daysUntilDeadline} days (${project.deadline.toISOString()})`,
            severity: Severity.HIGH,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: [],
            reasoning: 'Deadline is approaching critical window',
            impact: 'Very limited time to complete remaining work',
            recommendedAction: 'Increase resources or reduce scope',
          });
          health = HealthStatus.AT_RISK;
        } else if (projectDuration && projectDuration > 0 && project.startDate) {
          const elapsedMs = now.getTime() - project.startDate.getTime();
          const durationMs = project.deadline.getTime() - project.startDate.getTime();
          const percentageComplete = Math.min(Math.max((elapsedMs / durationMs) * 100, 0), 100);

          if (
            project.reportedProgressPct !== undefined &&
            project.reportedProgressPct !== null &&
            project.reportedProgressPct < percentageComplete - PROGRESS_VARIANCE_TOLERANCE_PCT
          ) {
            findings.push({
              category: 'SCHEDULE',
              title: 'Behind Schedule',
              description: `Expected progress: ${percentageComplete.toFixed(0)}%, Reported: ${project.reportedProgressPct}%`,
              severity: Severity.MEDIUM,
              confidence: Confidence.HIGH,
              evidenceUpdateIds: [],
              evidenceRecordIds: [],
              reasoning: 'Project progress lags behind expected timeline',
              impact: 'Risk of missing deadline',
              recommendedAction: 'Review progress with team, identify blockers',
            });
            health = HealthStatus.AT_RISK;
          }
        }
      }

      // Check 2: Last update freshness
      const latestUpdate = [...data.updates].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];
      const latestUpdateIsNewer = Boolean(
        latestUpdate &&
        (!project.lastReportedUpdateAt ||
          latestUpdate.timestamp.getTime() >= project.lastReportedUpdateAt.getTime()),
      );
      const lastUpdateAt = latestUpdateIsNewer && latestUpdate
        ? latestUpdate.timestamp
        : project.lastReportedUpdateAt;

      if (lastUpdateAt) {
        const daysSinceUpdate = this.daysBetween(lastUpdateAt, now);
        if (daysSinceUpdate > 7) {
          findings.push({
            category: 'SCHEDULE',
            title: 'Stale Status Update',
            description: `Last update was ${daysSinceUpdate} days ago`,
            severity: Severity.MEDIUM,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: latestUpdateIsNewer && latestUpdate ? [latestUpdate.updateId] : [],
            evidenceRecordIds: [],
            reasoning: 'Status information is outdated, schedule status uncertain',
            impact: 'Cannot reliably assess current schedule health',
          });
          confidence = Confidence.MEDIUM;
        }
      } else if (data.updates.length === 0) {
        findings.push({
          category: 'SCHEDULE',
          title: 'No Status Updates',
          description: 'No project updates received',
          severity: Severity.MEDIUM,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Lack of reporting makes schedule assessment unreliable',
          impact: 'Cannot assess current schedule status',
        });
        health = HealthStatus.INSUFFICIENT_DATA;
        confidence = Confidence.LOW;
      }

    } catch (error) {
      this.logger.error('Schedule health calculation error:', error);
      health = HealthStatus.INSUFFICIENT_DATA;
      confidence = Confidence.LOW;
    }

    return {
      health,
      confidence,
      findings,
      explanation: `Schedule health: ${health}. ${findings.length} findings. Based on deadline, progress, and update frequency.`,
    };
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / oneDay);
  }
}
