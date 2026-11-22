import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ScheduleHealthCalculator } from './health-calculators/schedule-health.calculator';
import { ProgressHealthCalculator } from './health-calculators/progress-health.calculator';
import { OperationalHealthCalculator } from './health-calculators/operational-health.calculator';
import { EvidenceHealthCalculator } from './health-calculators/evidence-and-quality.calculator';
import { HealthStatus, Confidence, Severity } from '@prisma/client';

describe('IntelligenceService', () => {
  let service: IntelligenceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        ScheduleHealthCalculator,
        ProgressHealthCalculator,
        OperationalHealthCalculator,
        EvidenceHealthCalculator,
        PrismaService,
      ],
    }).compile();

    service = module.get<IntelligenceService>(IntelligenceService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean database before each test
    await prisma.followUpHistory.deleteMany();
    await prisma.followUp.deleteMany();
    await prisma.projectFinding.deleteMany();
    await prisma.projectAssessment.deleteMany();
    await prisma.productionRecord.deleteMany();
    await prisma.projectUpdate.deleteMany();
    await prisma.project.deleteMany();
  });

  describe('assessProject', () => {
    it('should create complete assessment with findings', async () => {
      // 1. Create test project
      const project = await prisma.project.create({
        data: {
          projectId: 'TEST001',
          projectName: 'Test Project',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          reportedProgressPct: 45.0,
          reportedStatus: 'ON_TRACK',
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          customer: 'Test Corp',
        },
      });

      // 2. Add project update
      await prisma.projectUpdate.create({
        data: {
          projectId: project.id,
          updateId: 'update_001',
          timestamp: new Date(),
          sourceType: 'EMAIL',
          sourceName: 'Project Manager',
          message: 'Progress on track, development underway',
        },
      });

      // 3. Add production record
      await prisma.productionRecord.create({
        data: {
          projectId: project.id,
          sourceRecordId: 'prod_001',
          generatedAt: new Date(),
          sourceSystem: 'MONITORING',
          recordType: 'PERFORMANCE',
          timestamp: new Date(),
          payload: {
            response_time_ms: 145,
            error_rate_pct: 0.01,
            uptime_pct: 99.9,
          },
        },
      });

      // 4. Run assessment
      const assessment = await service.assessProject(project.id);

      // 5. Verify assessment
      expect(assessment).toBeDefined();
      expect(assessment.projectId).toBe(project.id);
      expect(assessment.overallStatus).toBeDefined();
      expect([
        HealthStatus.HEALTHY,
        HealthStatus.AT_RISK,
        HealthStatus.NEEDS_ATTENTION,
        HealthStatus.INSUFFICIENT_DATA,
      ]).toContain(assessment.overallStatus);

      expect(assessment.confidenceLevel).toBeDefined();
      expect([
        Confidence.LOW,
        Confidence.MEDIUM,
        Confidence.HIGH,
      ]).toContain(assessment.confidenceLevel);

      expect(Array.isArray(assessment.findings)).toBe(true);
    });

    it('should identify schedule risk when deadline approaching', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'RISK001',
          projectName: 'Risk Project',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days (critical)
          reportedProgressPct: 30.0, // Low progress
          reportedStatus: 'AT_RISK',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.projectUpdate.create({
        data: {
          projectId: project.id,
          updateId: 'risk_update_001',
          timestamp: new Date(),
          sourceType: 'EMAIL',
          sourceName: 'PM',
          message: 'Behind schedule, team working on blockers',
        },
      });

      const assessment = await service.assessProject(project.id);

      expect(assessment.scheduleHealth).toBe(HealthStatus.AT_RISK);
      expect(assessment.findings.length).toBeGreaterThan(0);

      const scheduleFindings = assessment.findings.filter(
        (f) => f.category === 'SCHEDULE',
      );
      expect(scheduleFindings.length).toBeGreaterThan(0);
    });

    it('should detect operational incidents', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'OPS001',
          projectName: 'Ops Project',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 50.0,
          reportedStatus: 'ON_TRACK',
        },
      });

      // Add multiple incidents
      for (let i = 0; i < 3; i++) {
        await prisma.productionRecord.create({
          data: {
            projectId: project.id,
            sourceRecordId: `incident_${i}`,
            generatedAt: new Date(),
            sourceSystem: 'JIRA',
            recordType: 'INCIDENT',
            timestamp: new Date(),
            payload: {
              severity: 'HIGH',
              status: 'RESOLVED',
              resolution_time_mins: 60,
            },
          },
        });
      }

      const assessment = await service.assessProject(project.id);

      const operationalFindings = assessment.findings.filter(
        (f) => f.category === 'OPERATIONAL',
      );
      expect(operationalFindings.length).toBeGreaterThan(0);
    });

    it('should flag insufficient data when no updates', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'NODATA001',
          projectName: 'No Data Project',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const assessment = await service.assessProject(project.id);

      expect(assessment.evidenceHealth).toBe(HealthStatus.INSUFFICIENT_DATA);
      expect(assessment.confidenceLevel).toBe(Confidence.LOW);
    });

    it('should create follow-ups for critical findings', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'CRITICAL001',
          projectName: 'Critical Project',
          deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Past deadline
          reportedProgressPct: 10.0,
          reportedStatus: 'BLOCKED',
        },
      });

      const assessment = await service.assessProject(project.id);

      // Check that critical findings exist
      const criticalFindings = assessment.findings.filter(
        (f) => f.severity === Severity.CRITICAL,
      );

      if (criticalFindings.length > 0) {
        // Follow-ups should be created
        const followUps = await prisma.followUp.findMany({
          where: { projectId: project.id },
        });

        expect(followUps.length).toBeGreaterThan(0);
        followUps.forEach((fu) => {
          expect(fu.status).toBe('OPEN');
          expect(fu.findingId).toBeDefined();
        });
      }
    });

    it('should save assessment with asOfDate', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'ASOF001',
          projectName: 'As-Of Date Project',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 50.0,
        },
      });

      const asOfDate = new Date('2024-11-20');
      const assessment = await service.assessProject(project.id, asOfDate);

      expect(assessment.asOfDate).toEqual(asOfDate);

      // Verify saved to database
      const saved = await prisma.projectAssessment.findFirst({
        where: { projectId: project.id, asOfDate },
      });

      expect(saved).toBeDefined();
      expect(saved.asOfDate).toEqual(asOfDate);
    });
  });

  describe('getLatestAssessment', () => {
    it('should return latest assessment when multiple exist', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'LATEST001',
          projectName: 'Latest Project',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 50.0,
        },
      });

      // Create two assessments
      const date1 = new Date('2024-11-18');
      const date2 = new Date('2024-11-20');

      await service.assessProject(project.id, date1);
      const latest = await service.assessProject(project.id, date2);

      const retrieved = await service.getLatestAssessment(project.id);

      expect(retrieved.id).toBe(latest.id);
      expect(retrieved.asOfDate).toEqual(date2);
    });

    it('should throw when no assessment exists', async () => {
      const nonExistentProjectId = 'nonexistent-id';

      await expect(
        service.getLatestAssessment(nonExistentProjectId),
      ).rejects.toThrow();
    });
  });

  describe('Evidence linking', () => {
    it('should link findings to update evidence', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'EVIDENCE001',
          projectName: 'Evidence Project',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 30.0,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const update = await prisma.projectUpdate.create({
        data: {
          projectId: project.id,
          updateId: 'evidence_update_001',
          timestamp: new Date(),
          sourceType: 'EMAIL',
          sourceName: 'PM',
          message: 'Behind schedule',
        },
      });

      const assessment = await service.assessProject(project.id);

      const scheduleFindings = assessment.findings.filter(
        (f) => f.category === 'SCHEDULE',
      );

      if (scheduleFindings.length > 0) {
        const finding = scheduleFindings[0];
        expect(finding.evidenceUpdateIds).toContain(update.updateId);
      }
    });

    it('should link findings to production record evidence', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: 'PRODLINK001',
          projectName: 'Prod Link Project',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 50.0,
        },
      });

      const record = await prisma.productionRecord.create({
        data: {
          projectId: project.id,
          sourceRecordId: 'perf_record_001',
          generatedAt: new Date(),
          sourceSystem: 'MONITORING',
          recordType: 'PERFORMANCE',
          timestamp: new Date(),
          payload: {
            response_time_ms: 3000, // Slow
            error_rate_pct: 2.0, // High
            uptime_pct: 94.0, // Low
          },
        },
      });

      const assessment = await service.assessProject(project.id);

      const operationalFindings = assessment.findings.filter(
        (f) => f.category === 'OPERATIONAL',
      );

      if (operationalFindings.length > 0) {
        const finding = operationalFindings[0];
        expect(finding.evidenceRecordIds).toContain(record.sourceRecordId);
      }
    });
  });
});
