import { HealthStatus, Severity, Confidence } from "@prisma/client";
import { HealthFindingDto } from "@common/dto/assessment.dto";
import { AssessmentScoringService } from "./assessment-scoring.service";

describe("AssessmentScoringService", () => {
  const service = new AssessmentScoringService();

  it("keeps confidence separate from severity-based scoring", () => {
    const finding: HealthFindingDto = {
      category: "SCHEDULE",
      title: "Deadline approaching",
      description: "The deadline is close.",
      severity: Severity.MEDIUM,
      confidence: Confidence.LOW,
      evidenceUpdateIds: [],
      evidenceRecordIds: [],
      reasoning: "The project deadline is approaching.",
    };

    expect(service.calculateHealthScore([finding])).toBe(25);
  });

  it("aggregates only assessable dimension health statuses", () => {
    expect(
      service.aggregateHealthStatus([
        HealthStatus.INSUFFICIENT_DATA,
        HealthStatus.AT_RISK,
        HealthStatus.HEALTHY,
      ]),
    ).toBe(HealthStatus.AT_RISK);
    expect(
      service.aggregateHealthStatus([
        HealthStatus.INSUFFICIENT_DATA,
        HealthStatus.INSUFFICIENT_DATA,
      ]),
    ).toBe(HealthStatus.INSUFFICIENT_DATA);
  });

  it("returns a weighted average on the original 0-100 scale", () => {
    expect(
      service.aggregateDimensionScores({
        schedule: 80,
        progress: 40,
      }),
    ).toBe(60);
  });
});
