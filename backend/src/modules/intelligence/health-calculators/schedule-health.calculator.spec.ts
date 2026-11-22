import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleHealthCalculator } from './schedule-health.calculator';
import { AssessmentDataDto } from '@common/dto/assessment.dto';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

describe('ScheduleHealthCalculator', () => {
  let calculator: ScheduleHealthCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleHealthCalculator],
    }).compile();

    calculator = module.get<ScheduleHealthCalculator>(ScheduleHealthCalculator);
  });

  describe('calculate', () => {
    it('should return HEALTHY for on-track project', () => {
      const data: AssessmentDataDto = {
        projectId: 'proj-1',
        project: {
          projectName: 'Test',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days away
          reportedProgressPct: 50,
          reportedStatus: 'ON_TRACK',
          lastReportedUpdateAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
        updates: [
          {
            updateId: 'update_1',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            sourceType: 'EMAIL',
            sourceName: 'PM',
            message: 'On track for delivery',
          },
        ],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      expect(result.health).toBe(HealthStatus.HEALTHY);
      expect(result.findings.length).toBe(0);
    });

    it('should return CRITICAL when deadline has passed', () => {
      const data: AssessmentDataDto = {
        projectId: 'proj-2',
        project: {
          projectName: 'Overdue',
          deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          reportedProgressPct: 50,
          reportedStatus: 'DELAYED',
          lastReportedUpdateAt: new Date(),
        },
        updates: [],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      expect(result.health).toBe(HealthStatus.NEEDS_ATTENTION);
      const deadlineFindings = result.findings.filter(
        (f) => f.title === 'Deadline Passed',
      );
      expect(deadlineFindings.length).toBeGreaterThan(0);
      expect(deadlineFindings[0].severity).toBe(Severity.CRITICAL);
    });

    it('should alert when deadline within 14 days', () => {
      const data: AssessmentDataDto = {
        projectId: 'proj-3',
        project: {
          projectName: 'Critical',
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          reportedProgressPct: 40,
          reportedStatus: 'ON_TRACK',
          lastReportedUpdateAt: new Date(),
        },
        updates: [{ updateId: 'u1', timestamp: new Date(), sourceType: 'EMAIL', sourceName: 'PM', message: 'OK' }],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      expect(result.health).toBe(HealthStatus.AT_RISK);
      const criticalFindings = result.findings.filter(
        (f) => f.title === 'Deadline Critical',
      );
      expect(criticalFindings.length).toBeGreaterThan(0);
    });

    it('should detect stale updates', () => {
      const data: AssessmentDataDto = {
        projectId: 'proj-4',
        project: {
          projectName: 'Stale',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          reportedProgressPct: 50,
          lastReportedUpdateAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
        updates: [
          {
            updateId: 'stale_update_001',
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            sourceType: 'EMAIL',
            sourceName: 'PM',
            message: 'Status update',
          },
        ],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      const staleFindings = result.findings.filter(
        (f) => f.title === 'Stale Status Update',
      );
      expect(staleFindings.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(Confidence.MEDIUM);
      expect(staleFindings[0].evidenceUpdateIds).toEqual(['stale_update_001']);
    });

    it('should flag insufficient data when no updates', () => {
      const data: AssessmentDataDto = {
        projectId: 'proj-5',
        project: {
          projectName: 'No Updates',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        updates: [],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      expect(result.health).toBe(HealthStatus.INSUFFICIENT_DATA);
      expect(result.confidence).toBe(Confidence.LOW);
    });

    it('should detect behind schedule', () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      const deadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
      const now = new Date();
      const daysElapsed = 60;
      const totalDays = 180;
      const expectedProgress = (daysElapsed / totalDays) * 100; // ~33%

      const data: AssessmentDataDto = {
        projectId: 'proj-6',
        project: {
          projectName: 'Behind',
          startDate,
          deadline,
          reportedProgressPct: 20, // Less than expected
          reportedStatus: 'ON_TRACK',
          lastReportedUpdateAt: new Date(),
        },
        updates: [{ updateId: 'u1', timestamp: new Date(), sourceType: 'EMAIL', sourceName: 'PM', message: 'OK' }],
        productionRecords: [],
      };

      const result = calculator.calculate(data);

      expect(result.health).toBe(HealthStatus.AT_RISK);
      const behindFindings = result.findings.filter(
        (f) => f.title === 'Behind Schedule',
      );
      expect(behindFindings.length).toBeGreaterThan(0);
    });
  });
});
