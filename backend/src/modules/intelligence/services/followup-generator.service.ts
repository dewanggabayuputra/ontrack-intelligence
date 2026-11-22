import { Injectable, Logger } from '@nestjs/common';
import { HealthFindingDto } from '@common/dto/assessment.dto';
import { Severity } from '@prisma/client';

/**
 * Follow-up Generator Service
 * Auto-generates recommended follow-up actions based on findings
 */
@Injectable()
export class FollowUpGeneratorService {
  private readonly logger = new Logger(FollowUpGeneratorService.name);

  /**
   * Generate follow-up action recommendations from findings
   */
  generateFollowUps(findings: HealthFindingDto[]): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    // Filter for actionable findings (CRITICAL and HIGH severity)
    const actionableFindings = findings.filter(
      (f) => f.severity === Severity.CRITICAL || f.severity === Severity.HIGH,
    );

    for (const finding of actionableFindings) {
      const recommendation = this.createRecommendation(finding);
      recommendations.push(recommendation);
    }

    // Sort by priority
    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Create follow-up recommendation from a finding
   */
  private createRecommendation(finding: HealthFindingDto): FollowUpRecommendation {
    const dueDate = this.calculateDueDate(finding.severity);
    const owner = this.suggestOwner(finding.category);

    let title = '';
    let description = '';
    let priority: FollowUpRecommendation['priority'] = 'MEDIUM';

    // Generate title and description based on finding category
    switch (finding.category) {
      case 'SCHEDULE':
        title = `[SCHEDULE] ${finding.title}`;
        description = `${finding.description}\n\nAction: ${finding.recommendedAction || 'Review project timeline'}\n\nReasoning: ${finding.reasoning}`;
        priority = finding.severity === Severity.CRITICAL ? 'CRITICAL' : 'HIGH';
        break;

      case 'PROGRESS':
        title = `[PROGRESS] ${finding.title}`;
        description = `${finding.description}\n\nAction: ${finding.recommendedAction || 'Assess blockers'}\n\nReasoning: ${finding.reasoning}`;
        priority = finding.severity === Severity.CRITICAL ? 'CRITICAL' : 'HIGH';
        break;

      case 'OPERATIONAL':
        title = `[OPERATIONS] ${finding.title}`;
        description = `${finding.description}\n\nAction: ${finding.recommendedAction || 'Investigate operational issues'}\n\nReasoning: ${finding.reasoning}`;
        priority = finding.severity === Severity.CRITICAL ? 'CRITICAL' : 'HIGH';
        break;

      case 'DATA_QUALITY':
        title = `[DATA] ${finding.title}`;
        description = `${finding.description}\n\nAction: ${finding.recommendedAction || 'Verify data quality'}\n\nReasoning: ${finding.reasoning}`;
        priority = 'MEDIUM';
        break;

      default:
        title = `[ACTION] ${finding.title}`;
        description = `${finding.description}\n\nAction: ${finding.recommendedAction || 'Take corrective action'}\n\nReasoning: ${finding.reasoning}`;
        priority = finding.severity === Severity.CRITICAL ? 'CRITICAL' : 'HIGH';
    }

    return {
      title,
      description,
      owner,
      dueDate,
      priority,
      relatedFinding: {
        id: finding.title,
        category: finding.category,
        severity: finding.severity,
      },
    };
  }

  /**
   * Calculate due date based on severity
   */
  private calculateDueDate(severity: Severity): Date {
    const now = new Date();

    switch (severity) {
      case Severity.CRITICAL:
        // Due today (or next business day if today is holiday)
        now.setDate(now.getDate() + 1);
        return now;
      case Severity.HIGH:
        // Due in 3 days
        now.setDate(now.getDate() + 3);
        return now;
      case Severity.MEDIUM:
        // Due in 7 days
        now.setDate(now.getDate() + 7);
        return now;
      case Severity.LOW:
        // Due in 14 days
        now.setDate(now.getDate() + 14);
        return now;
      default:
        return now;
    }
  }

  /**
   * Suggest owner based on finding category
   */
  private suggestOwner(category: string): string {
    switch (category) {
      case 'SCHEDULE':
        return 'Project Manager';
      case 'PROGRESS':
        return 'Team Lead';
      case 'OPERATIONAL':
        return 'Operations Lead';
      case 'DATA_QUALITY':
        return 'Data Owner';
      default:
        return 'Project Manager';
    }
  }

  /**
   * Prioritize follow-ups
   */
  private prioritizeRecommendations(
    recommendations: FollowUpRecommendation[],
  ): FollowUpRecommendation[] {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Group follow-ups by category for dashboard view
   */
  groupFollowUpsByCategory(
    followups: FollowUpRecommendation[],
  ): Record<string, FollowUpRecommendation[]> {
    return followups.reduce(
      (acc, followup) => {
        const category = followup.relatedFinding.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(followup);
        return acc;
      },
      {} as Record<string, FollowUpRecommendation[]>,
    );
  }

  /**
   * Generate daily digest of top priority follow-ups
   */
  generateDigest(followups: FollowUpRecommendation[]): {
    total: number;
    critical: number;
    high: number;
    topItems: FollowUpRecommendation[];
  } {
    const critical = followups.filter((f) => f.priority === 'CRITICAL').length;
    const high = followups.filter((f) => f.priority === 'HIGH').length;
    const topItems = followups.slice(0, 5); // Top 5

    return {
      total: followups.length,
      critical,
      high,
      topItems,
    };
  }
}

export interface FollowUpRecommendation {
  title: string;
  description: string;
  owner: string;
  dueDate: Date;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  relatedFinding: {
    id: string;
    category: string;
    severity: Severity;
  };
}
