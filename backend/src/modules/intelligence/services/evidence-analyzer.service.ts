import { Injectable, Logger } from '@nestjs/common';
import { HealthFindingDto } from '@common/dto/assessment.dto';
import { Severity, Confidence } from '@prisma/client';

/**
 * Evidence Analyzer Service
 * Extracts insights from raw evidence (updates, production records)
 * Identifies patterns, anomalies, and risk signals
 */
@Injectable()
export class EvidenceAnalyzerService {
  private readonly logger = new Logger(EvidenceAnalyzerService.name);

  /**
   * Risk keywords that indicate problems
   */
  private readonly RISK_KEYWORDS = {
    CRITICAL: ['fail', 'critical', 'emergency', 'urgent', 'down', 'crash'],
    HIGH: [
      'delay',
      'blocked',
      'stuck',
      'issue',
      'problem',
      'error',
      'failed',
      'risk',
      'alert',
    ],
    MEDIUM: [
      'pending',
      'waiting',
      'hold',
      'review',
      'investigate',
      'concern',
      'monitor',
    ],
  };

  /**
   * Positive keywords (confidence builders)
   */
  private readonly POSITIVE_KEYWORDS = [
    'complete',
    'done',
    'success',
    'resolved',
    'fixed',
    'deployed',
    'live',
  ];

  /**
   * Analyze text content for risk indicators
   */
  analyzeTextForRisk(text: string): {
    severity: Severity;
    risk_indicators: string[];
    confidence_level: Confidence;
  } {
    if (!text) {
      return {
        severity: Severity.LOW,
        risk_indicators: [],
        confidence_level: Confidence.LOW,
      };
    }

    const lowerText = text.toLowerCase();
    const indicators = [];

    // Check for critical keywords
    for (const keyword of this.RISK_KEYWORDS.CRITICAL) {
      if (lowerText.includes(keyword)) {
        indicators.push(`CRITICAL_${keyword}`);
      }
    }

    // Check for high-risk keywords
    for (const keyword of this.RISK_KEYWORDS.HIGH) {
      if (lowerText.includes(keyword)) {
        indicators.push(`HIGH_${keyword}`);
      }
    }

    // Check for medium-risk keywords
    for (const keyword of this.RISK_KEYWORDS.MEDIUM) {
      if (lowerText.includes(keyword)) {
        indicators.push(`MEDIUM_${keyword}`);
      }
    }

    // Determine severity
    let severity: Severity = Severity.LOW;
    if (indicators.some((i) => i.startsWith('CRITICAL'))) {
      severity = Severity.CRITICAL;
    } else if (indicators.some((i) => i.startsWith('HIGH'))) {
      severity = Severity.HIGH;
    } else if (indicators.some((i) => i.startsWith('MEDIUM'))) {
      severity = Severity.MEDIUM;
    }

    // Determine confidence based on keyword specificity
    const confidenceLevel =
      indicators.length > 3 ? Confidence.HIGH : indicators.length > 1 ? Confidence.MEDIUM : Confidence.LOW;

    return {
      severity,
      risk_indicators: indicators,
      confidence_level: confidenceLevel,
    };
  }

  /**
   * Detect anomalies in production records
   * e.g., deployment failures, performance degradation, incidents
   */
  detectProductionAnomalies(records: any[]): {
    anomalies: any[];
    severity: Severity;
    explanation: string;
  } {
    const anomalies = [];
    let maxSeverity: Severity = Severity.LOW;

    // Group by record type
    const byType = this.groupBy(records, (r) => r.recordType);

    // Check DEPLOYMENT records
    if (byType.DEPLOYMENT) {
      const deployments = byType.DEPLOYMENT;

      // Detect failed deployments
      const failedDeployments = deployments.filter(
        (d) =>
          d.payload?.status === 'failed' ||
          d.payload?.status === 'error' ||
          d.payload?.status === 'rollback',
      );

      if (failedDeployments.length > 0) {
        anomalies.push({
          type: 'FAILED_DEPLOYMENTS',
          count: failedDeployments.length,
          severity: Severity.CRITICAL,
          details: `${failedDeployments.length} deployment failures detected`,
        });
        maxSeverity = Severity.CRITICAL;
      }

      // Detect frequent deployments (instability indicator)
      const recentDeployments = deployments.filter(
        (d) =>
          new Date(d.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      );

      if (recentDeployments.length > 10) {
        anomalies.push({
          type: 'HIGH_DEPLOYMENT_FREQUENCY',
          count: recentDeployments.length,
          severity: Severity.MEDIUM,
          details: `${recentDeployments.length} deployments in last 7 days (possible instability)`,
        });
        if (maxSeverity === Severity.LOW) maxSeverity = Severity.MEDIUM;
      }
    }

    // Check INCIDENT records
    if (byType.INCIDENT) {
      const incidents = byType.INCIDENT;
      const criticalIncidents = incidents.filter(
        (i) => i.payload?.severity === 'CRITICAL' || i.payload?.severity === 'HIGH',
      );

      if (criticalIncidents.length > 0) {
        anomalies.push({
          type: 'CRITICAL_INCIDENTS',
          count: criticalIncidents.length,
          severity: Severity.HIGH,
          details: `${criticalIncidents.length} critical/high incidents`,
        });
        if (maxSeverity === Severity.LOW || maxSeverity === Severity.MEDIUM) {
          maxSeverity = Severity.HIGH;
        }
      }
    }

    // Check PERFORMANCE records
    if (byType.PERFORMANCE) {
      const performances = byType.PERFORMANCE;
      const poorPerformance = performances.filter(
        (p) =>
          p.payload?.error_rate_pct > 5 ||
          p.payload?.response_time_ms > 3000 ||
          p.payload?.availability_pct < 99,
      );

      if (poorPerformance.length > 0) {
        anomalies.push({
          type: 'POOR_PERFORMANCE',
          count: poorPerformance.length,
          severity: Severity.HIGH,
          details: 'Performance metrics degraded',
        });
        if (maxSeverity === Severity.LOW || maxSeverity === Severity.MEDIUM) {
          maxSeverity = Severity.HIGH;
        }
      }
    }

    const explanation =
      anomalies.length > 0
        ? `${anomalies.length} production anomalies detected`
        : 'No significant anomalies detected';

    return {
      anomalies,
      severity: maxSeverity,
      explanation,
    };
  }

  /**
   * Analyze update frequency and communication patterns
   */
  analyzeUpdatePatterns(updates: any[]): {
    frequency: 'REGULAR' | 'SPARSE' | 'NO_UPDATES';
    lastUpdateAge: number; // days
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    gaps: Array<{ start: Date; end: Date; daysGap: number }>;
  } {
    if (updates.length === 0) {
      return {
        frequency: 'NO_UPDATES',
        lastUpdateAge: Infinity,
        trend: 'DECLINING',
        gaps: [],
      };
    }

    // Sort by timestamp
    const sorted = [...updates].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate frequency
    const daySpan = this.daysBetween(sorted[0].timestamp, sorted[sorted.length - 1].timestamp);
    const frequency = daySpan > 0 ? (sorted.length / daySpan) * 7 : 0; // updates per week

    const frequencyLabel =
      frequency > 3 ? 'REGULAR' : frequency > 0.5 ? 'SPARSE' : 'NO_UPDATES';

    // Last update age
    const now = new Date();
    const lastUpdateAge = this.daysBetween(sorted[sorted.length - 1].timestamp, now);

    // Trend analysis (compare recent vs older updates)
    const midpoint = Math.floor(sorted.length / 2);
    const recentFreq = sorted.length - midpoint;
    const olderFreq = midpoint;

    const trend =
      recentFreq > olderFreq * 1.2 ? 'IMPROVING' : recentFreq < olderFreq * 0.8 ? 'DECLINING' : 'STABLE';

    // Find gaps between updates
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = this.daysBetween(sorted[i - 1].timestamp, sorted[i].timestamp);
      if (gap > 7) {
        // Report gaps > 7 days
        gaps.push({
          start: sorted[i - 1].timestamp,
          end: sorted[i].timestamp,
          daysGap: gap,
        });
      }
    }

    return {
      frequency: frequencyLabel,
      lastUpdateAge,
      trend,
      gaps,
    };
  }

  /**
   * Helper: Group array by key function
   */
  private groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return arr.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Helper: Calculate days between dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / oneDay);
  }
}
