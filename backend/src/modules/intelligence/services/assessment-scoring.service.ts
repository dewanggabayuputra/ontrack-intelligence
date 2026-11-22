import { Injectable, Logger } from '@nestjs/common';
import { HealthStatus, Severity, Confidence } from '@prisma/client';
import { AssessmentDataDto, HealthCalculationResultDto, HealthFindingDto } from '@common/dto/assessment.dto';

/**
 * Assessment Scoring Service
 * Centralized scoring and weighing system for all health dimensions
 * Supports configurable thresholds for different project types
 */
@Injectable()
export class AssessmentScoringService {
  private readonly logger = new Logger(AssessmentScoringService.name);

  /**
   * Scoring Model:
   * - GREEN (0-30): Healthy
   * - YELLOW (31-70): At Risk
   * - RED (71-100): Needs Attention
   */
  private readonly SCORE_THRESHOLDS = {
    HEALTHY: { min: 0, max: 30 },
    AT_RISK: { min: 31, max: 70 },
    NEEDS_ATTENTION: { min: 71, max: 100 },
  };

  /**
   * Severity-to-score mapping (impact contribution)
   */
  private readonly SEVERITY_SCORES = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 100,
  };

  /**
   * Calculate composite health score from findings
   * Confidence is tracked independently and does not change severity-based health.
   */
  calculateHealthScore(findings: HealthFindingDto[]): number {
    if (findings.length === 0) {
      return 0; // HEALTHY if no findings
    }

    let totalScore = 0;
    let maxPossible = 0;

    // Weight each finding by severity
    findings.forEach((finding) => {
      const severityScore = this.SEVERITY_SCORES[finding.severity] || 0;
      totalScore += severityScore;
      maxPossible += 100; // Max severity (CRITICAL)
    });

    // Normalize to 0-100 scale
    let score = (totalScore / maxPossible) * 100;

    return Math.min(score, 100);
  }

  /**
   * Map score to health status
   */
  scoreToStatus(score: number): HealthStatus {
    if (score <= this.SCORE_THRESHOLDS.HEALTHY.max) {
      return HealthStatus.HEALTHY;
    } else if (score <= this.SCORE_THRESHOLDS.AT_RISK.max) {
      return HealthStatus.AT_RISK;
    } else {
      return HealthStatus.NEEDS_ATTENTION;
    }
  }

  /**
   * Aggregate multiple dimension scores into overall score
   * Weights: Schedule (25%), Progress (25%), Operational (20%), Evidence (15%), Quality (15%)
   */
  aggregateDimensionScores(scores: {
    schedule?: number;
    progress?: number;
    operational?: number;
    evidence?: number;
    quality?: number;
  }): number {
    const weights = {
      schedule: 0.25,
      progress: 0.25,
      operational: 0.2,
      evidence: 0.15,
      quality: 0.15,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    if (scores.schedule !== undefined) {
      weightedSum += scores.schedule * weights.schedule;
      totalWeight += weights.schedule;
    }
    if (scores.progress !== undefined) {
      weightedSum += scores.progress * weights.progress;
      totalWeight += weights.progress;
    }
    if (scores.operational !== undefined) {
      weightedSum += scores.operational * weights.operational;
      totalWeight += weights.operational;
    }
    if (scores.evidence !== undefined) {
      weightedSum += scores.evidence * weights.evidence;
      totalWeight += weights.evidence;
    }
    if (scores.quality !== undefined) {
      weightedSum += scores.quality * weights.quality;
      totalWeight += weights.quality;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  aggregateHealthStatus(statuses: HealthStatus[]): HealthStatus {
    const assessableStatuses = statuses.filter(
      (status) => status !== HealthStatus.INSUFFICIENT_DATA,
    );

    if (assessableStatuses.length === 0) {
      return HealthStatus.INSUFFICIENT_DATA;
    }
    if (assessableStatuses.includes(HealthStatus.NEEDS_ATTENTION)) {
      return HealthStatus.NEEDS_ATTENTION;
    }
    if (assessableStatuses.includes(HealthStatus.AT_RISK)) {
      return HealthStatus.AT_RISK;
    }
    return HealthStatus.HEALTHY;
  }

  /**
   * Aggregate confidence levels (takes minimum as most conservative)
   */
  aggregateConfidence(confidences: Confidence[]): Confidence {
    if (confidences.includes(Confidence.LOW)) return Confidence.LOW;
    if (confidences.includes(Confidence.MEDIUM)) return Confidence.MEDIUM;
    return Confidence.HIGH;
  }

  /**
   * Prioritize findings by severity and confidence
   */
  prioritizeFindings(findings: HealthFindingDto[]): HealthFindingDto[] {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const confidenceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    return [...findings].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      const confidenceDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      return confidenceDiff;
    });
  }

  /**
   * Determine if assessment requires immediate attention
   */
  requiresAttention(overallStatus: HealthStatus): boolean {
    return (
      overallStatus === HealthStatus.NEEDS_ATTENTION ||
      overallStatus === HealthStatus.AT_RISK
    );
  }

  /**
   * Generate risk color code for UI
   */
  getRiskColor(status: HealthStatus): string {
    switch (status) {
      case HealthStatus.HEALTHY:
        return '#22c55e'; // Green
      case HealthStatus.AT_RISK:
        return '#f59e0b'; // Amber/Yellow
      case HealthStatus.NEEDS_ATTENTION:
        return '#ef4444'; // Red
      default:
        return '#9ca3af'; // Gray (insufficient data)
    }
  }
}
