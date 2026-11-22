import { Injectable, Logger } from '@nestjs/common';
import { AssessmentDataDto, HealthCalculationResultDto, HealthFindingDto } from '@common/dto/assessment.dto';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

/**
 * Operational Health Calculator
 * Evaluates: Deployments, incidents, uptime, performance
 */
@Injectable()
export class OperationalHealthCalculator {
  private readonly logger = new Logger(OperationalHealthCalculator.name);

  /**
   * Calculate operational health based on:
   * - Deployment frequency and success
   * - Incident count and severity
   * - System uptime
   * - Performance metrics
   */
  calculate(data: AssessmentDataDto): HealthCalculationResultDto {
    const findings: HealthFindingDto[] = [];
    let health: HealthStatus = HealthStatus.HEALTHY;
    let confidence: Confidence = Confidence.HIGH;

    try {
      if (data.productionRecords.length === 0) {
        findings.push({
          category: 'OPERATIONAL',
          title: 'No Production Data',
          description: 'No operational metrics received',
          severity: Severity.MEDIUM,
          confidence: Confidence.HIGH,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Cannot assess operational health without production data',
          impact: 'Operational status is unknown',
        });
        health = HealthStatus.INSUFFICIENT_DATA;
        confidence = Confidence.LOW;
        return { health, confidence, findings, explanation: 'No production data available' };
      }

      // Organize records by type
      const deployments = data.productionRecords.filter((r) => r.recordType === 'DEPLOYMENT');
      const incidents = data.productionRecords.filter((r) => r.recordType === 'INCIDENT');
      const performanceRecords = data.productionRecords.filter((r) => r.recordType === 'PERFORMANCE');

      // Check 1: Incident Analysis
      if (incidents.length > 0) {
        const recentIncidents = [...incidents]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);
        const criticalCount = recentIncidents.filter(
          (i) => i.payload?.severity === 'CRITICAL' || i.payload?.severity === 'HIGH',
        ).length;

        if (criticalCount > 0) {
          findings.push({
            category: 'OPERATIONAL',
            title: 'Critical Incidents',
            description: `${criticalCount} critical/high incidents in recent records`,
            severity: Severity.CRITICAL,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: recentIncidents.map((r) => r.sourceRecordId),
            reasoning: 'System experiencing critical operational issues',
            impact: 'Production service quality severely impacted',
            recommendedAction: 'Immediate incident response required',
          });
          health = HealthStatus.NEEDS_ATTENTION;
        } else if (incidents.length > 5) {
          findings.push({
            category: 'OPERATIONAL',
            title: 'High Incident Rate',
            description: `${incidents.length} incidents recorded`,
            severity: Severity.MEDIUM,
            confidence: Confidence.HIGH,
            evidenceUpdateIds: [],
            evidenceRecordIds: incidents.slice(0, 10).map((r) => r.sourceRecordId),
            reasoning: 'Frequent incidents indicate systemic issues',
            impact: 'System reliability is compromised',
            recommendedAction: 'Root cause analysis and remediation needed',
          });
          health = HealthStatus.AT_RISK;
        }
      }

      // Check 2: Performance Metrics
      if (performanceRecords.length > 0) {
        const recentPerf = performanceRecords.reduce((latest, record) =>
          record.timestamp.getTime() > latest.timestamp.getTime() ? record : latest,
        );

        if (recentPerf.payload?.uptime_pct !== undefined) {
          const uptime = recentPerf.payload.uptime_pct;
          if (uptime < 95) {
            findings.push({
              category: 'OPERATIONAL',
              title: 'Low Uptime',
              description: `System uptime: ${uptime}% (target: 99%+)`,
              severity: uptime < 90 ? Severity.HIGH : Severity.MEDIUM,
              confidence: Confidence.HIGH,
              evidenceUpdateIds: [],
              evidenceRecordIds: [recentPerf.sourceRecordId],
              reasoning: 'System availability below acceptable threshold',
              impact: 'Users experiencing service interruptions',
              recommendedAction: 'Investigate uptime issues and implement resilience improvements',
            });
            health = HealthStatus.AT_RISK;
          }
        }

        if (recentPerf.payload?.response_time_ms !== undefined) {
          const responseTime = recentPerf.payload.response_time_ms;
          if (responseTime > 2000) {
            findings.push({
              category: 'OPERATIONAL',
              title: 'Slow Performance',
              description: `Response time: ${responseTime}ms (target: <500ms)`,
              severity: Severity.MEDIUM,
              confidence: Confidence.HIGH,
              evidenceUpdateIds: [],
              evidenceRecordIds: [recentPerf.sourceRecordId],
              reasoning: 'Application response time is degraded',
              impact: 'Poor user experience and satisfaction',
              recommendedAction: 'Performance profiling and optimization needed',
            });
            health = HealthStatus.AT_RISK;
          }
        }

        if (recentPerf.payload?.error_rate_pct !== undefined) {
          const errorRate = recentPerf.payload.error_rate_pct;
          if (errorRate > 1) {
            findings.push({
              category: 'OPERATIONAL',
              title: 'High Error Rate',
              description: `Error rate: ${errorRate}% (target: <0.1%)`,
              severity: Severity.MEDIUM,
              confidence: Confidence.HIGH,
              evidenceUpdateIds: [],
              evidenceRecordIds: [recentPerf.sourceRecordId],
              reasoning: 'Significant error rate in production',
              impact: 'Application stability is compromised',
              recommendedAction: 'Error analysis and code review required',
            });
            health = HealthStatus.AT_RISK;
          }
        }
      }

      // Check 3: Deployment Frequency & Health
      if (deployments.length === 0) {
        findings.push({
          category: 'OPERATIONAL',
          title: 'No Recent Deployments',
          description: 'No deployment records found',
          severity: Severity.LOW,
          confidence: Confidence.MEDIUM,
          evidenceUpdateIds: [],
          evidenceRecordIds: [],
          reasoning: 'Cannot verify that changes are being deployed',
          impact: 'Unable to assess update frequency',
        });
        confidence = Confidence.MEDIUM;
      } else {
        // Check deployment success rate
        const failedDeployments = deployments.filter(
          (d) => d.payload?.status === 'failed' || d.payload?.status === 'error' || d.payload?.status === 'rollback',
        );

        if (failedDeployments.length > 0) {
          const failureRate = (failedDeployments.length / deployments.length) * 100;
          if (failureRate > 20) {
            findings.push({
              category: 'OPERATIONAL',
              title: 'High Deployment Failure Rate',
              description: `${failureRate.toFixed(0)}% of deployments failed`,
              severity: Severity.HIGH,
              confidence: Confidence.HIGH,
              evidenceUpdateIds: [],
              evidenceRecordIds: failedDeployments.slice(0, 5).map((d) => d.sourceRecordId),
              reasoning: 'Deployment pipeline has quality issues',
              impact: 'Risk of service disruption from failed deployments',
              recommendedAction: 'Review deployment processes and testing procedures',
            });
            health = HealthStatus.AT_RISK;
          }
        } else if (deployments.length >= 5) {
          health = HealthStatus.HEALTHY;
        }
      }

      if (findings.length === 0 && health === HealthStatus.HEALTHY) {
        health = HealthStatus.HEALTHY;
      }
    } catch (error) {
      this.logger.error('Operational health calculation error:', error);
      health = HealthStatus.INSUFFICIENT_DATA;
      confidence = Confidence.LOW;
    }

    return {
      health,
      confidence,
      findings,
      explanation: `Operational health: ${health}. ${findings.length} findings. Based on incidents, performance, and deployments.`,
    };
  }
}
