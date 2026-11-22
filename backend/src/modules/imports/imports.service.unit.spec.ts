import { mkdtemp, readFile, readdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PrismaService } from "../../prisma/prisma.service";
import { CsvParserService } from "../../common/services/csv-parser.service";
import { JsonParserService } from "../../common/services/json-parser.service";
import { ImportsService } from "./imports.service";

function createService() {
  const batch = {
    id: "batch-id",
    batchName: "IMPORT",
    fileName: "data.csv",
    fileHash: "hash",
    status: "PROCESSING",
    recordsProcessed: 0,
    recordsImported: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
  };
  const prisma = {
    importBatch: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...batch, ...data }),
        ),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...batch, ...data }),
        ),
    },
    project: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "internal-project-id" }),
      update: jest.fn().mockResolvedValue({ id: "internal-project-id" }),
    },
    projectUpdate: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    productionRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  return {
    service: new ImportsService(
      prisma,
      new CsvParserService(),
      new JsonParserService(),
    ),
    prisma,
  };
}

describe("ImportsService source contract mapping", () => {
  const originalDictionaryDirectory = process.env.DATA_DICTIONARY_DIR;
  let dictionaryDirectory: string;

  beforeEach(async () => {
    dictionaryDirectory = await mkdtemp(join(tmpdir(), "ontrack-dictionary-"));
    process.env.DATA_DICTIONARY_DIR = dictionaryDirectory;
  });

  afterEach(async () => {
    if (originalDictionaryDirectory === undefined) {
      delete process.env.DATA_DICTIONARY_DIR;
    } else {
      process.env.DATA_DICTIONARY_DIR = originalDictionaryDirectory;
    }
    await rm(dictionaryDirectory, { recursive: true, force: true });
  });

  it("maps snake_case project fields into the project model", async () => {
    const { service, prisma } = createService();
    const csv = Buffer.from(
      [
        "project_id,project_name,customer,project_type,pic,start_date,deadline,target,target_unit,reported_actual,reported_progress_pct,reported_status,last_reported_update_at",
        "PRJ-1,Website,Acme,Web,Sam,2026-01-01,2026-06-30,100,pages,25,25,ON_TRACK,2026-02-01",
      ].join("\n"),
    );

    const result = await service.importProjectMaster(csv, "projects.csv");

    expect(result.recordsImported).toBe(1);
    expect(result.recordsFailed).toBe(0);
    expect(
      (prisma.project.create as jest.Mock).mock.calls[0][0].data,
    ).toMatchObject({
      projectId: "PRJ-1",
      projectName: "Website",
      customer: "Acme",
      reportedProgressPct: "25",
    });
  });

  it("keeps canonical production source IDs and nested payload intact", async () => {
    const { service, prisma } = createService();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "internal-project-id",
    });
    const payload = { deployment: { version: "2.1", successful: true } };
    const json = Buffer.from(
      JSON.stringify([
        {
          generated_at: "2026-02-02T10:00:00.000Z",
          source_record_id: "deploy-001",
          project_id: "PRJ-1",
          source_system: "CI",
          record_type: "DEPLOYMENT",
          timestamp: "2026-02-02T09:30:00.000Z",
          payload,
        },
      ]),
    );

    const result = await service.importProductionData(json, "production.json");

    expect(result.recordsImported).toBe(1);
    expect(result.recordsFailed).toBe(0);
    expect(
      (prisma.productionRecord.create as jest.Mock).mock.calls[0][0].data,
    ).toMatchObject({
      projectId: "internal-project-id",
      sourceRecordId: "deploy-001",
      sourceSystem: "CI",
      recordType: "DEPLOYMENT",
      payload,
    });
  });

  it("imports production fixtures with custom record types and preserves their source types", async () => {
    const { service, prisma } = createService();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "internal-project-id",
    });
    const fixturePath = join(
      __dirname,
      "../../../test/fixtures/04_Production_Data.json",
    );
    const json = await readFile(fixturePath);

    const result = await service.importProductionData(
      json,
      "04_Production_Data.json",
    );
    const importedRecords = (
      prisma.productionRecord.create as jest.Mock
    ).mock.calls.map(([{ data }]) => data);

    expect(result.recordsProcessed).toBe(12);
    expect(result.recordsImported).toBe(12);
    expect(result.recordsSkipped).toBe(0);
    expect(result.recordsFailed).toBe(0);
    expect(importedRecords[0]).toMatchObject({
      sourceRecordId: "DMS-ZETA-001",
      recordType: "CUSTOM",
      payload: {
        sourceRecordType: "system_status",
        environment: "production",
      },
    });
  });

  it("stores a valid PDF unchanged and records a downloadable import", async () => {
    const { service, prisma } = createService();
    const pdf = Buffer.from("%PDF-1.7\noriginal dictionary bytes");

    const result = await service.uploadDataDictionaryPdf(pdf, "dictionary.pdf");

    expect(result.status).toBe("COMPLETED");
    expect(result.recordsImported).toBe(1);
    expect(result.fileUrl).toContain(
      `/imports/data-dictionary/${result.importBatchId}/file`,
    );
    const storedFiles = await readdir(dictionaryDirectory);
    expect(storedFiles).toHaveLength(1);
    expect(await readFile(join(dictionaryDirectory, storedFiles[0]))).toEqual(
      pdf,
    );
    expect(prisma.importBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ batchName: "DATA_DICTIONARY_PDF" }),
      }),
    );
    const storedBatch = {
      ...(prisma.importBatch.create as jest.Mock).mock.calls[0][0].data,
      id: result.importBatchId,
      status: "COMPLETED",
    };
    (prisma.importBatch.findUnique as jest.Mock).mockResolvedValue(storedBatch);
    const download = await service.getDataDictionaryPdf(result.importBatchId);
    const downloadedChunks: Buffer[] = [];
    for await (const chunk of download.getStream()) {
      downloadedChunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(downloadedChunks)).toEqual(pdf);
  });

  it("rejects invalid PDF content before creating an import batch", async () => {
    const { service, prisma } = createService();

    await expect(
      service.uploadDataDictionaryPdf(
        Buffer.from("not a PDF"),
        "dictionary.pdf",
      ),
    ).rejects.toThrow("File content is not a valid PDF document.");
    expect(prisma.importBatch.create).not.toHaveBeenCalled();
  });
});
