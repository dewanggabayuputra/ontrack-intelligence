import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { HealthStatus, Severity, Confidence } from '@prisma/client';

/**
 * DTO untuk Assessment Request
 */
export class AssessmentRequestDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  asOfDate?: Date;
}

/**
 * DTO untuk Assessment Response
 */
export class ProjectAssessmentResponseDto {
  id: string;
  projectId: string;
  asOfDate: Date;
  assessmentDate: Date;

  scheduleHealth: HealthStatus;
  progressHealth: HealthStatus;
  operationalHealth: HealthStatus;
  evidenceHealth: HealthStatus;
  dataQuality: HealthStatus;

  overallStatus: HealthStatus;
  requiresAttention: boolean;
  confidenceLevel: Confidence;
  summary?: string;

  findings: FindingResponseDto[];
}

/**
 * DTO untuk Finding
 */
export class FindingResponseDto {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;

  evidenceUpdateIds: string[];
  evidenceRecordIds: string[];

  reasoning: string;
  impact?: string;
  recommendedAction?: string;
}

/**
 * DTO untuk Assessment Input Data
 * Internal use untuk rule engine
 */
export class AssessmentDataDto {
  projectId: string;
  project: {
    projectName: string;
    startDate?: Date;
    deadline?: Date;
    target?: string;
    targetUnit?: string;
    reportedActual?: number;
    reportedProgressPct?: number;
    reportedStatus?: string;
    lastReportedUpdateAt?: Date;
  };

  updates: {
    updateId: string;
    timestamp: Date;
    sourceType: string;
    sourceName: string;
    message: string;
  }[];

  productionRecords: {
    sourceRecordId: string;
    recordType: string;
    timestamp: Date;
    payload: any;
  }[];
}

/**
 * DTO untuk Health Calculation Result
 */
export class HealthCalculationResultDto {
  health: HealthStatus;
  confidence: Confidence;
  findings: HealthFindingDto[];
  explanation: string;
}

/**
 * DTO untuk individual finding dari health calculator
 */
export class HealthFindingDto {
  category: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  evidenceUpdateIds: string[];
  evidenceRecordIds: string[];
  reasoning: string;
  impact?: string;
  recommendedAction?: string;
}
