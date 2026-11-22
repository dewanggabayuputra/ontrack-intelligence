import { AssessmentDataDto } from "@common/dto/assessment.dto";
import { HealthStatus } from "@prisma/client";
import { OperationalHealthCalculator } from "./operational-health.calculator";

describe("OperationalHealthCalculator", () => {
  const calculator = new OperationalHealthCalculator();

  it("assesses the latest performance record instead of the oldest", () => {
    const data: AssessmentDataDto = {
      projectId: "project-1",
      project: { projectName: "Project" },
      updates: [],
      productionRecords: [
        {
          sourceRecordId: "old-performance",
          recordType: "PERFORMANCE",
          timestamp: new Date("2025-01-01T00:00:00.000Z"),
          payload: { uptime_pct: 80, response_time_ms: 5000 },
        },
        {
          sourceRecordId: "latest-performance",
          recordType: "PERFORMANCE",
          timestamp: new Date("2025-01-02T00:00:00.000Z"),
          payload: { uptime_pct: 99.9, response_time_ms: 150 },
        },
      ],
    };

    const result = calculator.calculate(data);

    expect(result.health).toBe(HealthStatus.HEALTHY);
    expect(
      result.findings.some((finding) =>
        finding.evidenceRecordIds.includes("old-performance"),
      ),
    ).toBe(false);
  });
});
