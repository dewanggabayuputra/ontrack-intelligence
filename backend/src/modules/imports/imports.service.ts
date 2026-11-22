import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { ImportBatch, ImportStatus, Prisma, RecordType } from "@prisma/client";
import { createReadStream } from "fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../../prisma/prisma.service";
import { CsvParserService } from "../../common/services/csv-parser.service";
import { JsonParserService } from "../../common/services/json-parser.service";
import { validateRow } from "../../common/utils/validation.util";
import { hashFileContent } from "../../common/utils/hash.util";
import {
  ProjectMasterRowDto,
  ProjectUpdateRowDto,
  ProductionRecordRowDto,
} from "../../common/dto/project.dto";

interface ImportError {
  lineNumber: number;
  field?: string;
  message: string;
}

interface ImportWarning {
  lineNumber: number;
  message: string;
}

interface ImportCounts {
  processed: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

interface StartedBatch {
  batch: ImportBatch;
  alreadyCompleted: boolean;
}

const PROJECT_MASTER_FIELDS = [
  "projectId",
  "projectName",
  "customer",
  "projectType",
  "pic",
  "startDate",
  "deadline",
  "target",
  "targetUnit",
  "reportedActual",
  "reportedProgressPct",
  "reportedStatus",
  "lastReportedUpdateAt",
  "sponsor",
  "manager",
  "endDate",
  "status",
  "budget",
];

const PROJECT_UPDATE_FIELDS = [
  "updateId",
  "projectId",
  "timestamp",
  "sourceType",
  "sourceName",
  "message",
  "updateDate",
  "reportedStatus",
  "progress",
  "milestones",
  "issues",
  "risks",
  "notes",
];

const PRODUCTION_RECORD_FIELDS = [
  "generatedAt",
  "sourceRecordId",
  "projectId",
  "sourceSystem",
  "recordType",
  "timestamp",
  "recordDate",
  "payload",
];

const DATA_DICTIONARY_PDF = "DATA_DICTIONARY_PDF";
const MAX_DATA_DICTIONARY_SIZE = 20 * 1024 * 1024;

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private readonly dataDictionaryDirectory =
    process.env.DATA_DICTIONARY_DIR ??
    join(process.cwd(), "uploads", "data-dictionaries");

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
    private readonly jsonParser: JsonParserService,
  ) {}

  async importProjectMaster(fileBuffer: Buffer, fileName: string) {
    const started = await this.startImportBatch(
      "PROJECT_MASTER_CSV",
      fileName,
      fileBuffer,
    );
    if (started.alreadyCompleted)
      return this.duplicateFileResult(started.batch);

    const counts = this.emptyCounts();
    try {
      const parsed = await this.csvParser.parseBuffer(fileBuffer);
      counts.processed = parsed.totalRows;

      for (const row of parsed.rows) {
        const lineWarnings: ImportWarning[] = [];
        try {
          const project = this.normalizeRow(
            row.data,
            PROJECT_MASTER_FIELDS,
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            project,
            "sponsor",
            "customer",
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            project,
            "manager",
            "pic",
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            project,
            "endDate",
            "deadline",
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            project,
            "status",
            "reportedStatus",
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            project,
            "budget",
            "target",
            lineWarnings,
            row.lineNumber,
          );

          if (
            project.budget !== undefined &&
            project.targetUnit === undefined
          ) {
            project.targetUnit = "budget";
          }

          const validationErrors = await validateRow(
            ProjectMasterRowDto,
            project,
          );
          if (validationErrors.length) {
            counts.errors.push({
              lineNumber: row.lineNumber,
              message: validationErrors.join("; "),
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          const projectData: Prisma.ProjectUncheckedCreateInput = {
            projectId: project.projectId as string,
            projectName: project.projectName as string,
            ...(project.customer !== undefined && {
              customer: project.customer as string,
            }),
            ...(project.projectType !== undefined && {
              projectType: project.projectType as string,
            }),
            ...(project.pic !== undefined && { pic: project.pic as string }),
            ...(project.startDate !== undefined && {
              startDate: new Date(project.startDate as string),
            }),
            ...(project.deadline !== undefined && {
              deadline: new Date(project.deadline as string),
            }),
            ...(project.target !== undefined && {
              target: project.target as string,
            }),
            ...(project.targetUnit !== undefined && {
              targetUnit: project.targetUnit as string,
            }),
            ...(project.reportedActual !== undefined && {
              reportedActual: project.reportedActual as string,
            }),
            ...(project.reportedProgressPct !== undefined && {
              reportedProgressPct: project.reportedProgressPct as string,
            }),
            ...(project.reportedStatus !== undefined && {
              reportedStatus: project.reportedStatus as string,
            }),
            ...(project.lastReportedUpdateAt !== undefined && {
              lastReportedUpdateAt: new Date(
                project.lastReportedUpdateAt as string,
              ),
            }),
          };

          const existing = await this.prisma.project.findUnique({
            where: { projectId: projectData.projectId },
          });
          if (existing) {
            const changed = this.changedFields(existing, projectData);
            if (changed.length) {
              lineWarnings.push({
                lineNumber: row.lineNumber,
                message: `Existing project values updated from master source: ${changed.join(", ")}`,
              });
              await this.prisma.project.update({
                where: { projectId: projectData.projectId },
                data: projectData,
              });
              counts.imported++;
            } else {
              counts.skipped++;
            }
          } else {
            await this.prisma.project.create({ data: projectData });
            counts.imported++;
          }
        } catch (error) {
          this.addRowError(counts, row.lineNumber, error);
        }
        counts.warnings.push(...lineWarnings);
      }

      return this.completeImport(
        started.batch,
        "PROJECT_MASTER_CSV",
        fileName,
        counts,
      );
    } catch (error) {
      await this.failImport(started.batch.id, error);
    }
  }

  async importProjectUpdates(fileBuffer: Buffer, fileName: string) {
    const started = await this.startImportBatch(
      "PROJECT_UPDATES_CSV",
      fileName,
      fileBuffer,
    );
    if (started.alreadyCompleted)
      return this.duplicateFileResult(started.batch);

    const counts = this.emptyCounts();
    try {
      const parsed = await this.csvParser.parseBuffer(fileBuffer);
      counts.processed = parsed.totalRows;

      for (const row of parsed.rows) {
        const lineWarnings: ImportWarning[] = [];
        try {
          const update = this.normalizeRow(
            row.data,
            PROJECT_UPDATE_FIELDS,
            lineWarnings,
            row.lineNumber,
          );
          this.applyAlias(
            update,
            "updateDate",
            "timestamp",
            lineWarnings,
            row.lineNumber,
          );
          const legacyFields = [
            "reportedStatus",
            "progress",
            "milestones",
            "issues",
            "risks",
            "notes",
          ];
          const isLegacyRow =
            update.timestamp !== undefined && update.updateId === undefined;

          if (
            !update.message &&
            legacyFields.some((field) => update[field] !== undefined)
          ) {
            update.message = legacyFields
              .filter((field) => update[field] !== undefined)
              .map((field) => `${field}: ${update[field]}`)
              .join(" | ");
          }
          if (isLegacyRow) {
            update.sourceType ??= "IMPORT";
            update.sourceName ??= fileName;
            update.updateId = this.fallbackSourceId("legacy_update", update);
            lineWarnings.push({
              lineNumber: row.lineNumber,
              message:
                "Legacy update row has no update_id; a deterministic source ID was generated.",
            });
          }

          const validationErrors = await validateRow(
            ProjectUpdateRowDto,
            update,
          );
          if (validationErrors.length) {
            counts.errors.push({
              lineNumber: row.lineNumber,
              message: validationErrors.join("; "),
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          const project = await this.prisma.project.findUnique({
            where: { projectId: update.projectId as string },
          });
          if (!project) {
            lineWarnings.push({
              lineNumber: row.lineNumber,
              message: `Project ${update.projectId} not found; update was skipped.`,
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          const updateData: Prisma.ProjectUpdateUncheckedCreateInput = {
            projectId: project.id,
            updateId: update.updateId as string,
            timestamp: new Date(update.timestamp as string),
            sourceType: update.sourceType as string,
            sourceName: update.sourceName as string,
            message: update.message as string,
          };
          const existing = await this.prisma.projectUpdate.findUnique({
            where: { updateId: updateData.updateId },
          });
          if (existing && existing.projectId !== project.id) {
            lineWarnings.push({
              lineNumber: row.lineNumber,
              message: `update_id ${updateData.updateId} is already associated with another project; no overwrite was made.`,
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          if (existing) {
            const changed = this.changedFields(existing, updateData);
            if (!changed.length) {
              counts.skipped++;
            } else {
              lineWarnings.push({
                lineNumber: row.lineNumber,
                message: `Existing update ${updateData.updateId} changed in source; updated fields: ${changed.join(", ")}`,
              });
              await this.prisma.projectUpdate.update({
                where: { updateId: updateData.updateId },
                data: updateData,
              });
              counts.imported++;
            }
          } else {
            await this.prisma.projectUpdate.create({ data: updateData });
            counts.imported++;
          }
        } catch (error) {
          this.addRowError(counts, row.lineNumber, error);
        }
        counts.warnings.push(...lineWarnings);
      }

      return this.completeImport(
        started.batch,
        "PROJECT_UPDATES_CSV",
        fileName,
        counts,
      );
    } catch (error) {
      await this.failImport(started.batch.id, error);
    }
  }

  async importProductionData(fileBuffer: Buffer, fileName: string) {
    const started = await this.startImportBatch(
      "PRODUCTION_DATA_JSON",
      fileName,
      fileBuffer,
    );
    if (started.alreadyCompleted)
      return this.duplicateFileResult(started.batch);

    const counts = this.emptyCounts();
    try {
      const parsed = await this.jsonParser.parseBuffer(fileBuffer);
      counts.processed = parsed.totalRows;

      for (const row of parsed.rows) {
        const lineWarnings: ImportWarning[] = [];
        try {
          const record = this.normalizeRow(
            row.data,
            PRODUCTION_RECORD_FIELDS,
            lineWarnings,
            row.index,
          );
          this.applyAlias(
            record,
            "recordDate",
            "timestamp",
            lineWarnings,
            row.index,
          );

          const rawRecord = row.rawData;
          const legacyRow = record.sourceRecordId === undefined;
          const projectId = record.projectId as string | undefined;
          const timestamp = record.timestamp as string | undefined;
          const payload = this.extractPayload(rawRecord);
          const sourceRecordType =
            typeof record.recordType === "string"
              ? record.recordType.trim()
              : undefined;
          if (sourceRecordType) {
            const supportedRecordType = Object.values(RecordType).find(
              (recordType) =>
                recordType.toLowerCase() === sourceRecordType.toLowerCase(),
            );
            if (supportedRecordType) {
              record.recordType = supportedRecordType;
            } else {
              record.recordType = RecordType.CUSTOM;
              payload.sourceRecordType = sourceRecordType;
              lineWarnings.push({
                lineNumber: row.index,
                message: `Unsupported record_type "${sourceRecordType}" was stored as CUSTOM; the original value is preserved in the payload.`,
              });
            }
          }
          if (legacyRow && projectId && timestamp) {
            record.sourceRecordId = this.fallbackSourceId("legacy_production", {
              projectId,
              timestamp,
              payload,
            });
            record.generatedAt ??= timestamp;
            record.sourceSystem ??= "IMPORT";
            record.recordType ??= RecordType.CUSTOM;
            record.payload = payload;
            lineWarnings.push({
              lineNumber: row.index,
              message:
                "Legacy production row has no source_record_id; a deterministic source ID was generated.",
            });
          }

          const validationErrors = await validateRow(
            ProductionRecordRowDto,
            record,
          );
          if (validationErrors.length) {
            counts.errors.push({
              lineNumber: row.index,
              message: validationErrors.join("; "),
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          const project = await this.prisma.project.findUnique({
            where: { projectId: record.projectId as string },
          });
          if (!project) {
            lineWarnings.push({
              lineNumber: row.index,
              message: `Project ${record.projectId} not found; production record was skipped.`,
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          const recordData: Prisma.ProductionRecordUncheckedCreateInput = {
            projectId: project.id,
            sourceRecordId: record.sourceRecordId as string,
            generatedAt: new Date(
              (record.generatedAt as string | undefined) || timestamp!,
            ),
            sourceSystem:
              (record.sourceSystem as string | undefined) || "IMPORT",
            recordType:
              (record.recordType as RecordType | undefined) ||
              RecordType.CUSTOM,
            timestamp: new Date(timestamp as string),
            payload: payload as Prisma.InputJsonValue,
          };
          const existing = await this.prisma.productionRecord.findUnique({
            where: { sourceRecordId: recordData.sourceRecordId },
          });
          if (existing && existing.projectId !== project.id) {
            lineWarnings.push({
              lineNumber: row.index,
              message: `source_record_id ${recordData.sourceRecordId} is already associated with another project; no overwrite was made.`,
            });
            counts.skipped++;
            counts.warnings.push(...lineWarnings);
            continue;
          }

          if (existing) {
            const changed = this.changedFields(existing, recordData);
            if (!changed.length) {
              counts.skipped++;
            } else {
              lineWarnings.push({
                lineNumber: row.index,
                message: `Existing production record ${recordData.sourceRecordId} changed in source; updated fields: ${changed.join(", ")}`,
              });
              await this.prisma.productionRecord.update({
                where: { sourceRecordId: recordData.sourceRecordId },
                data: recordData,
              });
              counts.imported++;
            }
          } else {
            await this.prisma.productionRecord.create({ data: recordData });
            counts.imported++;
          }
        } catch (error) {
          this.addRowError(counts, row.index, error);
        }
        counts.warnings.push(...lineWarnings);
      }

      return this.completeImport(
        started.batch,
        "PRODUCTION_DATA_JSON",
        fileName,
        counts,
      );
    } catch (error) {
      await this.failImport(started.batch.id, error);
    }
  }

  async uploadDataDictionaryPdf(fileBuffer: Buffer, fileName: string) {
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException("Data dictionary must be a PDF file.");
    }
    if (
      fileBuffer.length === 0 ||
      !fileBuffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))
    ) {
      throw new BadRequestException(
        "File content is not a valid PDF document.",
      );
    }
    if (fileBuffer.length > MAX_DATA_DICTIONARY_SIZE) {
      throw new BadRequestException("PDF file exceeds the 20 MB limit.");
    }

    const started = await this.startImportBatch(
      DATA_DICTIONARY_PDF,
      fileName,
      fileBuffer,
    );
    try {
      await this.storeDataDictionaryPdf(started.batch.fileHash, fileBuffer);
      if (started.alreadyCompleted) {
        return {
          ...this.duplicateFileResult(started.batch),
          fileUrl: this.dataDictionaryFileUrl(started.batch.id),
        };
      }

      const result = await this.completeImport(
        started.batch,
        DATA_DICTIONARY_PDF,
        fileName,
        {
          processed: 1,
          imported: 1,
          skipped: 0,
          errors: [],
          warnings: [],
        },
      );
      return {
        ...result,
        fileUrl: this.dataDictionaryFileUrl(started.batch.id),
      };
    } catch (error) {
      await this.failImport(started.batch.id, error);
    }
  }

  async getDataDictionaryPdf(batchId: string): Promise<StreamableFile> {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
    });
    if (
      !batch ||
      batch.batchName !== DATA_DICTIONARY_PDF ||
      batch.status !== ImportStatus.COMPLETED
    ) {
      throw new NotFoundException("Data dictionary PDF was not found.");
    }

    const filePath = this.dataDictionaryPath(batch.fileHash);
    try {
      await access(filePath);
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        throw new NotFoundException(
          "Stored data dictionary PDF file was not found.",
        );
      }
      throw error;
    }

    const safeFileName = batch.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new StreamableFile(createReadStream(filePath), {
      type: "application/pdf",
      disposition: `attachment; filename="${safeFileName}"`,
    });
  }

  async getImportHistory(limit = 50) {
    return this.prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  private async startImportBatch(
    sourceType: string,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<StartedBatch> {
    const fileHash = hashFileContent(fileBuffer);
    const previous = await this.prisma.importBatch.findFirst({
      where: { fileHash },
      orderBy: { createdAt: "desc" },
    });

    if (previous?.status === ImportStatus.COMPLETED) {
      return { batch: previous, alreadyCompleted: true };
    }
    if (previous?.status === ImportStatus.PROCESSING) {
      throw new ConflictException(
        `An import for ${fileName} is already processing.`,
      );
    }
    if (previous) {
      const batch = await this.prisma.importBatch.update({
        where: { id: previous.id },
        data: {
          batchName: sourceType,
          status: ImportStatus.PROCESSING,
          recordsProcessed: 0,
          recordsImported: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
          errorMessage: null,
          startedAt: new Date(),
          completedAt: null,
        },
      });
      return { batch, alreadyCompleted: false };
    }

    try {
      const batch = await this.prisma.importBatch.create({
        data: {
          batchName: sourceType,
          fileName,
          fileHash,
          status: ImportStatus.PROCESSING,
          startedAt: new Date(),
        },
      });
      return { batch, alreadyCompleted: false };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;

      const concurrent = await this.prisma.importBatch.findFirst({
        where: { fileHash },
        orderBy: { createdAt: "desc" },
      });
      if (concurrent?.status === ImportStatus.COMPLETED) {
        return { batch: concurrent, alreadyCompleted: true };
      }
      if (concurrent?.status === ImportStatus.PROCESSING) {
        throw new ConflictException(
          `An import for ${fileName} is already processing.`,
        );
      }
      throw error;
    }
  }

  private async completeImport(
    batch: ImportBatch,
    sourceType: string,
    fileName: string,
    counts: ImportCounts,
  ) {
    const updatedBatch = await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.COMPLETED,
        recordsProcessed: counts.processed,
        recordsImported: counts.imported,
        recordsSkipped: counts.skipped,
        recordsFailed: counts.errors.length,
        completedAt: new Date(),
      },
    });

    return {
      importBatchId: updatedBatch.id,
      sourceType,
      fileName,
      status: updatedBatch.status,
      recordsProcessed: counts.processed,
      recordsImported: counts.imported,
      recordsSkipped: counts.skipped,
      recordsFailed: counts.errors.length,
      errors: counts.errors,
      warnings: counts.warnings,
    };
  }

  private async failImport(batchId: string, error: unknown): Promise<never> {
    const message = this.errorMessage(error);
    this.logger.error("Import failed:", error);
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    throw new BadRequestException(`Import failed: ${message}`);
  }

  private duplicateFileResult(batch: ImportBatch) {
    return {
      importBatchId: batch.id,
      sourceType: batch.batchName,
      fileName: batch.fileName,
      status: batch.status,
      recordsProcessed: batch.recordsProcessed,
      recordsImported: 0,
      recordsSkipped: batch.recordsProcessed,
      recordsFailed: 0,
      errors: [],
      warnings: [
        {
          lineNumber: 0,
          message:
            "This exact file was already imported; no records were processed again.",
        },
      ],
    };
  }

  private async storeDataDictionaryPdf(fileHash: string, fileBuffer: Buffer) {
    await mkdir(this.dataDictionaryDirectory, { recursive: true });
    const filePath = this.dataDictionaryPath(fileHash);
    try {
      await writeFile(filePath, fileBuffer, { flag: "wx" });
    } catch (error) {
      if (!this.isFileExistsError(error)) throw error;

      const existingContent = await readFile(filePath);
      if (hashFileContent(existingContent) !== fileHash) {
        throw new ConflictException(
          "Stored PDF does not match its content hash.",
        );
      }
    }
  }

  private dataDictionaryPath(fileHash: string) {
    return join(this.dataDictionaryDirectory, `${fileHash}.pdf`);
  }

  private dataDictionaryFileUrl(batchId: string) {
    return `/imports/data-dictionary/${encodeURIComponent(batchId)}/file`;
  }

  private normalizeRow(
    row: Record<string, unknown>,
    fields: string[],
    warnings: ImportWarning[],
    lineNumber: number,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(row)) {
      const field = fields.find(
        (candidate) => this.normalizeKey(candidate) === this.normalizeKey(key),
      );
      if (!field) continue;

      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (value === "") continue;

      if (
        normalized[field] !== undefined &&
        !this.valuesEqual(normalized[field], value)
      ) {
        warnings.push({
          lineNumber,
          message: `Conflicting columns map to ${field}; the first value was kept.`,
        });
        continue;
      }
      normalized[field] = value;
    }
    return normalized;
  }

  private applyAlias(
    row: Record<string, unknown>,
    alias: string,
    field: string,
    warnings: ImportWarning[],
    lineNumber: number,
  ) {
    if (row[alias] === undefined) return;
    if (row[field] !== undefined && !this.valuesEqual(row[field], row[alias])) {
      warnings.push({
        lineNumber,
        message: `Conflicting values were provided for ${field} and its legacy alias ${alias}; ${field} was kept.`,
      });
      return;
    }
    row[field] ??= row[alias];
  }

  private extractPayload(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    if (
      raw.payload &&
      typeof raw.payload === "object" &&
      !Array.isArray(raw.payload)
    ) {
      return raw.payload as Record<string, unknown>;
    }

    const metadata = new Set([
      "generatedat",
      "sourcerecordid",
      "projectid",
      "sourcesystem",
      "recordtype",
      "timestamp",
      "recorddate",
    ]);
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([key]) => !metadata.has(this.normalizeKey(key)),
      ),
    );
  }

  private fallbackSourceId(prefix: string, value: unknown): string {
    return `${prefix}_${hashFileContent(Buffer.from(this.stableSerialize(value)))}`;
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value))
      return `[${value.map((item) => this.stableSerialize(item)).join(",")}]`;
    if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      return `{${Object.keys(object)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.stableSerialize(object[key])}`,
        )
        .join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
  }

  private changedFields(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
  ): string[] {
    return Object.entries(next)
      .filter(
        ([field, value]) =>
          value !== undefined && !this.valuesEqual(current[field], value),
      )
      .map(([field]) => field);
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    if (left instanceof Date || right instanceof Date) {
      const leftDate =
        left instanceof Date
          ? left.getTime()
          : new Date(String(left)).getTime();
      const rightDate =
        right instanceof Date
          ? right.getTime()
          : new Date(String(right)).getTime();
      return leftDate === rightDate;
    }
    if (
      left &&
      typeof left === "object" &&
      "toString" in left &&
      !(
        left instanceof Object &&
        Object.getPrototypeOf(left) === Object.prototype
      )
    ) {
      return String(left) === String(right);
    }
    return this.stableSerialize(left) === this.stableSerialize(right);
  }

  private normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private emptyCounts(): ImportCounts {
    return { processed: 0, imported: 0, skipped: 0, errors: [], warnings: [] };
  }

  private addRowError(
    counts: ImportCounts,
    lineNumber: number,
    error: unknown,
  ) {
    this.logger.error(`Error processing import row ${lineNumber}:`, error);
    counts.errors.push({ lineNumber, message: this.errorMessage(error) });
    counts.skipped++;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }

  private isFileExistsError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    );
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    );
  }
}
