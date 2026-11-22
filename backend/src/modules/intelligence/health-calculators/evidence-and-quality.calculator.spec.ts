import { AssessmentDataDto } from "@common/dto/assessment.dto";
import { HealthStatus } from "@prisma/client";
import { EvidenceHealthCalculator } from "./evidence-and-quality.calculator";

describe("EvidenceHealthCalculator", () => {
  const calculator = new EvidenceHealthCalculator();

  it("uses the latest project update as freshness evidence", () => {
    const data: AssessmentDataDto = {
      projectId: "project-1",
      project: { projectName: "Project" },
      updates: [
        {
          updateId: "stale_update_001",
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          sourceType: "EMAIL",
          sourceName: "PM",
          message: "Status update",
        },
      ],
      productionRecords: [],
    };

    const result = calculator.calculateEvidence(data);
    const staleFinding = result.findings.find(
      (finding) => finding.title === "Stale Updates",
    );

    expect(staleFinding?.evidenceUpdateIds).toEqual(["stale_update_001"]);
  });

  it("reports absent status updates as insufficient data, not a project failure", () => {
    const data: AssessmentDataDto = {
      projectId: "project-2",
      project: { projectName: "Project" },
      updates: [],
      productionRecords: [],
    };

    const result = calculator.calculateEvidence(data);

    expect(result.health).toBe(HealthStatus.INSUFFICIENT_DATA);
  });
});
