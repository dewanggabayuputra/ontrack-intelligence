export type HealthStatus =
  "HEALTHY" | "AT_RISK" | "NEEDS_ATTENTION" | "INSUFFICIENT_DATA";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type FollowUpStatus =
  "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";
export type ImportStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type RecordType =
  "DEPLOYMENT" | "INCIDENT" | "PERFORMANCE" | "OPERATIONAL" | "CUSTOM";

export interface Project {
  id: string;
  projectId: string;
  projectName: string;
  customer: string | null;
  projectType: string | null;
  pic: string | null;
  startDate: string | null;
  deadline: string | null;
  target: string | null;
  targetUnit: string | null;
  reportedActual: number | string | null;
  reportedProgressPct: number | string | null;
  reportedStatus: string | null;
  lastReportedUpdateAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  updateId: string;
  timestamp: string;
  sourceType: string;
  sourceName: string;
  message: string;
}

export interface ProductionRecord {
  sourceRecordId: string;
  generatedAt: string;
  recordType: RecordType;
  timestamp: string;
  sourceSystem: string;
  payload: Record<string, unknown>;
}

export interface ProjectEvidence {
  projectId: string;
  updates: ProjectUpdate[];
  productionRecords: ProductionRecord[];
  totalEvidence: number;
}

export interface ProjectFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  reasoning: string;
  impact: string | null;
  recommendedAction: string | null;
  evidenceUpdateIds: string[];
  evidenceRecordIds: string[];
}

export interface ProjectAssessment {
  id: string;
  projectId: string;
  asOfDate: string;
  assessmentDate: string;
  scheduleHealth: HealthStatus;
  progressHealth: HealthStatus;
  operationalHealth: HealthStatus;
  evidenceHealth: HealthStatus;
  dataQuality: HealthStatus;
  overallStatus: HealthStatus;
  requiresAttention: boolean;
  confidenceLevel: Confidence;
  summary?: string | null;
  findings: ProjectFinding[];
}

export interface FollowUp {
  id: string;
  projectId: string;
  findingId: string | null;
  title: string;
  description: string;
  owner: string | null;
  status: FollowUpStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    projectId: string;
    projectName: string;
  };
}

export interface FollowUpUpdate {
  status?: FollowUpStatus;
  owner?: string | null;
  dueDate?: string | null;
  changedBy?: string;
  notes?: string;
}

export interface FollowUpCreate {
  projectId: string;
  findingId?: string;
  title: string;
  description: string;
  owner?: string | null;
  status?: FollowUpStatus;
  dueDate?: string | null;
}

export interface FollowUpHistory {
  id: string;
  followUpId: string;
  fromStatus: FollowUpStatus;
  toStatus: FollowUpStatus;
  changedAt: string;
  changedBy: string | null;
  notes: string | null;
}

export interface ImportBatch {
  id: string;
  batchName: string | null;
  fileName: string;
  fileHash: string;
  status: ImportStatus;
  recordsProcessed: number;
  recordsImported: number;
  recordsFailed: number;
  recordsSkipped: number;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DataDictionaryUploadResult {
  importBatchId: string;
  sourceType: "DATA_DICTIONARY_PDF";
  fileName: string;
  fileUrl: string;
  status: ImportStatus;
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  warnings: Array<{ lineNumber: number; message: string }>;
}

export interface ImportResult {
  importBatchId: string;
  sourceType: string;
  fileName: string;
  status: ImportStatus;
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors?: Array<{ lineNumber: number; field?: string; message: string }>;
  warnings?: Array<{ lineNumber: number; message: string }>;
  fileUrl?: string;
}

export interface DashboardSummary {
  timestamp: string;
  summary: {
    totalProjects: number;
    healthyProjects: number;
    atRiskProjects: number;
    needsAttentionProjects: number;
    insufficientDataProjects: number;
    criticalFollowUps: number;
  };
  projects: Array<{
    projectId: string;
    projectName: string;
    status: HealthStatus;
    requiresAttention: boolean;
    asOfDate: string;
    findingsCount: number;
  }>;
}

export interface PortfolioEntry {
  project: Project;
  assessment: ProjectAssessment | null;
}
