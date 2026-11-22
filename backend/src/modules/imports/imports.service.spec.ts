import { Test, TestingModule } from '@nestjs/testing';
import { ImportsService } from './imports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CsvParserService } from '../../common/services/csv-parser.service';
import { JsonParserService } from '../../common/services/json-parser.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ImportsService', () => {
  let service: ImportsService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        ImportsService,
        CsvParserService,
        JsonParserService,
        PrismaService,
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean database before tests
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('importProjectMaster', () => {
    it('should import project master CSV successfully', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/project-master.csv');
      const fileBuffer = await fs.readFile(filePath);

      const result = await service.importProjectMaster(fileBuffer, 'project-master.csv');

      expect(result.status).toBe('COMPLETED');
      expect(result.recordsImported).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Verify data was inserted
      const projects = await prisma.project.findMany();
      expect(projects.length).toBe(4);
    });

    it('should handle duplicate project IDs by updating', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/project-master.csv');
      const fileBuffer = await fs.readFile(filePath);

      const result1 = await service.importProjectMaster(fileBuffer, 'project-master.csv');
      const result2 = await service.importProjectMaster(fileBuffer, 'project-master.csv');

      expect(result1.recordsImported).toBe(4);
      expect(result2.recordsImported).toBe(0);
      expect(result2.recordsSkipped).toBe(4);

      const projects = await prisma.project.findMany();
      expect(projects.length).toBe(4); // Still 4 projects
    });

    it('should validate required fields', async () => {
      const invalidCsv = Buffer.from(
        'projectId,projectName\nPROJ001\n', // Missing projectName
      );

      const result = await service.importProjectMaster(invalidCsv, 'invalid.csv');

      expect(result.recordsFailed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('importProjectUpdates', () => {
    beforeEach(async () => {
      // Ensure project exists for updates
      await prisma.project.create({
        data: {
          projectId: 'PROJ001',
          projectName: 'Test Project',
        },
      });
    });

    it('should import project updates CSV successfully', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/project-updates.csv');
      const fileBuffer = await fs.readFile(filePath);

      const result = await service.importProjectUpdates(fileBuffer, 'project-updates.csv');

      expect(result.status).toBe('COMPLETED');
      expect(result.recordsImported).toBeGreaterThan(0);
    });

    it('should prevent duplicate updates', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/project-updates.csv');
      const fileBuffer = await fs.readFile(filePath);

      const result1 = await service.importProjectUpdates(fileBuffer, 'project-updates.csv');
      const result2 = await service.importProjectUpdates(fileBuffer, 'project-updates.csv');

      expect(result1.recordsImported).toBeGreaterThan(0);
      expect(result2.recordsImported).toBe(0);
      expect(result2.recordsSkipped).toBe(result2.recordsProcessed);
    });

    it('should warn when project not found', async () => {
      const csvBuffer = Buffer.from(
        'projectId,updateDate,reportedStatus,progress\nINVALID_PROJECT,2024-11-20,ON_TRACK,50\n',
      );

      const result = await service.importProjectUpdates(csvBuffer, 'updates.csv');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('not found');
    });
  });

  describe('importProductionData', () => {
    beforeEach(async () => {
      // Ensure projects exist
      await prisma.project.createMany({
        data: [
          { projectId: 'PROJ001', projectName: 'Project 1' },
          { projectId: 'PROJ002', projectName: 'Project 2' },
          { projectId: 'PROJ003', projectName: 'Project 3' },
          { projectId: 'PROJ004', projectName: 'Project 4' },
        ],
      });
    });

    it('should import production data JSON successfully', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/production-data.json');
      const fileBuffer = await fs.readFile(filePath);

      const result = await service.importProductionData(fileBuffer, 'production-data.json');

      expect(result.status).toBe('COMPLETED');
      expect(result.recordsImported).toBe(4);
    });

    it('should prevent duplicate production records', async () => {
      const filePath = path.join(__dirname, '../../..', 'test/fixtures/production-data.json');
      const fileBuffer = await fs.readFile(filePath);

      const result1 = await service.importProductionData(fileBuffer, 'production-data.json');
      const result2 = await service.importProductionData(fileBuffer, 'production-data.json');

      expect(result1.recordsImported).toBe(4);
      expect(result2.recordsSkipped).toBe(4);
    });

    it('should handle JSON validation errors', async () => {
      const invalidJson = Buffer.from('[{"projectId":"PROJ001"}]');

      const result = await service.importProductionData(invalidJson, 'invalid.json');

      expect(result.recordsFailed).toBeGreaterThan(0);
    });
  });

  describe('getImportHistory', () => {
    it('should return import history', async () => {
      const history = await service.getImportHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const history = await service.getImportHistory(10);

      expect(history.length).toBeLessThanOrEqual(10);
    });
  });
});
