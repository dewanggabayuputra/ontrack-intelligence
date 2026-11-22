import { Test, TestingModule } from '@nestjs/testing';
import { JsonParserService } from './json-parser.service';

describe('JsonParserService', () => {
  let service: JsonParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonParserService],
    }).compile();

    service = module.get<JsonParserService>(JsonParserService);
  });

  describe('parseBuffer', () => {
    it('should parse array of objects', async () => {
      const json = Buffer.from(
        JSON.stringify([
          { projectId: 'PROJ001', value: 100 },
          { projectId: 'PROJ002', value: 200 },
        ]),
      );

      const result = await service.parseBuffer(json);

      expect(result.totalRows).toBe(2);
      expect(result.rows[0].data.projectid).toBe('PROJ001');
      expect(result.rows[1].data.value).toBe(200);
    });

    it('should parse object with records array', async () => {
      const json = Buffer.from(
        JSON.stringify({
          records: [
            { projectId: 'PROJ001' },
            { projectId: 'PROJ002' },
          ],
        }),
      );

      const result = await service.parseBuffer(json);

      expect(result.totalRows).toBe(2);
    });

    it('should parse object with data array', async () => {
      const json = Buffer.from(
        JSON.stringify({
          data: [{ projectId: 'PROJ001' }],
        }),
      );

      const result = await service.parseBuffer(json);

      expect(result.totalRows).toBe(1);
    });

    it('should normalize keys to lowercase', async () => {
      const json = Buffer.from(
        JSON.stringify([
          { ProjectId: 'PROJ001', RecordDate: '2024-11-20' },
        ]),
      );

      const result = await service.parseBuffer(json);

      expect(result.rows[0].data.projectid).toBe('PROJ001');
      expect(result.rows[0].data.recorddate).toBe('2024-11-20');
    });

    it('should flatten nested objects', async () => {
      const json = Buffer.from(
        JSON.stringify([
          {
            projectId: 'PROJ001',
            metrics: {
              responseTime: 145,
              errorRate: 0.01,
            },
          },
        ]),
      );

      const result = await service.parseBuffer(json);

      expect(result.rows[0].data.metrics_responsetime).toBe(145);
      expect(result.rows[0].data.metrics_errorrate).toBe(0.01);
    });

    it('should preserve the original record for production payload storage', async () => {
      const record = {
        project_id: 'P-1',
        payload: { nested: { value: 42 } },
      };
      const result = await service.parseBuffer(Buffer.from(JSON.stringify([record])));

      expect(result.rows[0].rawData).toEqual(record);
    });

    it('should handle empty array', async () => {
      const json = Buffer.from('[]');
      const result = await service.parseBuffer(json);

      expect(result.totalRows).toBe(0);
    });

    it('should throw on invalid JSON', async () => {
      const json = Buffer.from('{invalid json}');

      await expect(service.parseBuffer(json)).rejects.toThrow();
    });

    it('should throw on non-array at root', async () => {
      const json = Buffer.from('{"projectId": "PROJ001"}');

      await expect(service.parseBuffer(json)).rejects.toThrow();
    });
  });

  describe('validateStructure', () => {
    it('should detect missing required fields', async () => {
      const json = Buffer.from(
        JSON.stringify([
          { projectId: 'PROJ001' },
          { recordDate: '2024-11-20' }, // Missing projectId
        ]),
      );

      const result = await service.parseBuffer(json);
      const errors = service.validateStructure(result.rows, [
        'projectId',
        'recordDate',
      ]);

      expect(errors).toHaveLength(2);
      expect(errors.some((error) => error.includes('projectId'))).toBe(true);
      expect(errors.some((error) => error.includes('recordDate'))).toBe(true);
    });

    it('should return no errors when all fields present', async () => {
      const json = Buffer.from(
        JSON.stringify([
          { projectId: 'PROJ001', recordDate: '2024-11-20' },
        ]),
      );

      const result = await service.parseBuffer(json);
      const errors = service.validateStructure(result.rows, [
        'projectId',
        'recordDate',
      ]);

      expect(errors).toHaveLength(0);
    });
  });
});
