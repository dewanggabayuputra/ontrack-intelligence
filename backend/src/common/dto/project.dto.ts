import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { RecordType } from '@prisma/client';

/**
 * DTO for Project Master CSV import
 * Validates structure of each row
 */
export class ProjectMasterRowDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  pic?: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  targetUnit?: string;

  @IsOptional()
  @IsNumberString()
  reportedActual?: string;

  @IsOptional()
  @IsNumberString()
  reportedProgressPct?: string;

  @IsOptional()
  @IsString()
  reportedStatus?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsDateString()
  lastReportedUpdateAt?: string;
}

/**
 * DTO for Project Updates CSV import
 * Validates structure from project updates CSV
 */
export class ProjectUpdateRowDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsString()
  updateId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsDateString()
  updateDate?: string;

  @IsOptional()
  @IsString()
  reportedStatus?: string;

  @IsOptional()
  @IsNumberString()
  progress?: string;

  @IsOptional()
  @IsString()
  milestones?: string;

  @IsOptional()
  @IsString()
  issues?: string;

  @IsOptional()
  @IsString()
  risks?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for Production Data JSON import
 * Validates structure of production records
 */
export class ProductionRecordRowDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsOptional()
  @IsDateString()
  generatedAt?: string;

  @IsOptional()
  @IsString()
  sourceRecordId?: string;

  @IsOptional()
  @IsString()
  sourceSystem?: string;

  @IsOptional()
  @IsEnum(RecordType)
  recordType?: RecordType;

  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  recordDate?: string;
}

/**
 * Request DTO for file upload endpoints
 */
export class FileUploadDto {
  fileName: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Response DTO for import results
 */
export class ImportResultDto {
  importBatchId: string;
  sourceType: string;
  fileName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: ImportErrorDto[];
  warnings: ImportWarningDto[];
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Error details from import
 */
export class ImportErrorDto {
  lineNumber: number;
  field?: string;
  value?: string;
  message: string;
}

/**
 * Warning details from import
 */
export class ImportWarningDto {
  lineNumber: number;
  message: string;
}
