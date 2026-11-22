"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  Database,
  FileText,
  Info,
  RefreshCw,
} from "lucide-react";
import { useMemo } from "react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { FindingCard } from "@/components/FindingCard";
import { HealthBadge } from "@/components/HealthBadge";
import { FollowUpEditor } from "@/components/follow-ups/FollowUpEditor";
import { FollowUpCreateForm } from "@/components/follow-ups/FollowUpCreateForm";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/PageStates";
import { useProjectFollowUps } from "@/hooks/useFollowUps";
import { evidenceApi } from "@/lib/api/evidence.api";
import { getApiErrorMessage, isNotFoundError } from "@/lib/api/errors";
import { intelligenceApi } from "@/lib/api/intelligence.api";
import { projectsApi } from "@/lib/api/projects.api";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatValue,
} from "@/lib/utils/formatting";
import { HealthStatus } from "@/types";

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) throw new Error("Project data is not available.");
  return projectId;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const routeProjectId = params.id;
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ["project", routeProjectId],
    queryFn: () => projectsApi.getById(routeProjectId),
    enabled: Boolean(routeProjectId),
  });
  const project = projectQuery.data;
  const projectId = project?.id;

  const assessmentQuery = useQuery({
    queryKey: ["assessment", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      try {
        return await intelligenceApi.getLatestAssessment(
          requireProjectId(projectId),
        );
      } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
  });
  const historyQuery = useQuery({
    queryKey: ["assessment-history", projectId],
    queryFn: () =>
      intelligenceApi.getAssessmentHistory(requireProjectId(projectId), 10),
    enabled: Boolean(projectId),
  });
  const evidenceQuery = useQuery({
    queryKey: ["project-evidence", projectId],
    queryFn: () => evidenceApi.getProjectEvidence(requireProjectId(projectId)),
    enabled: Boolean(projectId),
  });
  const followUpsQuery = useProjectFollowUps(projectId);
  const assessment = assessmentQuery.data;
  const healthDimensions: Array<{ label: string; status: HealthStatus }> =
    assessment
      ? [
          { label: "Schedule health", status: assessment.scheduleHealth },
          { label: "Progress health", status: assessment.progressHealth },
          { label: "Operational health", status: assessment.operationalHealth },
          { label: "Evidence health", status: assessment.evidenceHealth },
          { label: "Data quality", status: assessment.dataQuality },
        ]
      : [];

  const findingById = useMemo(
    () =>
      new Map(
        (assessment?.findings ?? []).map((finding) => [finding.id, finding]),
      ),
    [assessment?.findings],
  );

  const assessMutation = useMutation({
    mutationFn: () =>
      intelligenceApi.assessProject(requireProjectId(projectId)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assessment", projectId] }),
        queryClient.invalidateQueries({
          queryKey: ["assessment-history", projectId],
        }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
    },
  });

  if (projectQuery.isPending)
    return <LoadingState label="Loading project information…" />;
  if (projectQuery.error) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          projectQuery.error,
          "Could not load this project.",
        )}
        onRetry={() => projectQuery.refetch()}
      />
    );
  }
  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="The Projects API did not return this project."
      />
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Portfolio
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-700">
              Project detail
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {project.projectName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {project.projectId} <span className="px-1 text-slate-300">·</span>{" "}
              {formatValue(project.customer)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
              Reported status · {formatValue(project.reportedStatus)}
            </span>
            {assessment && <HealthBadge status={assessment.overallStatus} />}
          </div>
        </div>
      </header>

      <nav
        aria-label="Project sections"
        className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 text-sm"
      >
        {[
          ["#project-information", "Project information"],
          ["#assessment-overview", "Assessment"],
          ["#findings", "Findings"],
          ["#source-evidence", "Evidence"],
          ["#follow-up-actions", "Follow-ups"],
          ["#assessment-history", "History"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            {label}
          </a>
        ))}
      </nav>

      <section
        id="project-information"
        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5">
          <h2 className="font-semibold text-slate-950">Project information</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reported and imported project context.
          </p>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="Project ID" value={project.projectId} />
          <InfoField label="Project name" value={project.projectName} />
          <InfoField label="Customer" value={formatValue(project.customer)} />
          <InfoField
            label="Project type"
            value={formatValue(project.projectType)}
          />
          <InfoField
            label="Project manager / PIC"
            value={formatValue(project.pic)}
          />
          <InfoField label="Start date" value={formatDate(project.startDate)} />
          <InfoField label="Deadline" value={formatDate(project.deadline)} />
          <InfoField
            label="Target"
            value={
              project.target === null
                ? "—"
                : `${project.target}${project.targetUnit ? ` ${project.targetUnit}` : ""}`
            }
          />
          <InfoField
            label="Reported actual"
            value={
              project.reportedActual === null
                ? "—"
                : `${formatNumber(project.reportedActual)}${project.targetUnit ? ` ${project.targetUnit}` : ""}`
            }
          />
          <InfoField
            label="Reported progress"
            value={formatPercentage(project.reportedProgressPct)}
          />
          <InfoField
            label="Reported status"
            value={formatValue(project.reportedStatus)}
          />
          <InfoField
            label="Last reported update"
            value={formatDateTime(project.lastReportedUpdateAt)}
          />
        </dl>
      </section>

      <section
        id="assessment-overview"
        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck
                size={18}
                className="text-blue-700"
                aria-hidden="true"
              />
              <h2 className="font-semibold text-slate-950">
                OnTrack assessment
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Application-generated interpretation of the available source data.
            </p>
          </div>
          {assessment && (
            <button
              type="button"
              onClick={() => assessMutation.mutate()}
              disabled={assessMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} aria-hidden="true" />
              {assessMutation.isPending ? "Assessing…" : "Run new assessment"}
            </button>
          )}
        </div>

        {assessmentQuery.isPending ? (
          <div className="mt-5">
            <LoadingState label="Loading latest assessment…" />
          </div>
        ) : assessmentQuery.error ? (
          <div className="mt-5">
            <ErrorState
              message={getApiErrorMessage(
                assessmentQuery.error,
                "Could not load the assessment.",
              )}
              onRetry={() => assessmentQuery.refetch()}
            />
          </div>
        ) : assessment ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {healthDimensions.map(({ label, status }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <div className="mt-2">
                    <HealthBadge status={status} size="sm" />
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Assessment confidence
                </p>
                <div className="mt-2">
                  <ConfidenceBadge confidence={assessment.confidenceLevel} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Assessment date
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDateTime(assessment.assessmentDate)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Assessment as of
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(assessment.asOfDate)}
                </p>
              </div>
            </div>
            {assessment.summary && (
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {assessment.summary}
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-950">
              No assessment is available for this project.
            </p>
            <p className="mt-1 text-sm text-blue-900">
              Reported status above is source data; it is not an assessed health
              result.
            </p>
            <button
              type="button"
              onClick={() => assessMutation.mutate()}
              disabled={assessMutation.isPending}
              className="mt-3 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {assessMutation.isPending ? "Assessing…" : "Run assessment"}
            </button>
          </div>
        )}
        {assessMutation.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {getApiErrorMessage(
              assessMutation.error,
              "Assessment could not be completed.",
            )}
          </p>
        )}
      </section>

      <section id="findings" className="scroll-mt-24 space-y-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950">
              Findings and attention
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Rule category is shown because the current assessment response
              does not provide a separate rule code.
            </p>
          </div>
        </div>
        {assessmentQuery.isPending ? (
          <LoadingState label="Loading assessment findings…" />
        ) : assessment ? (
          assessment.findings.length > 0 ? (
            assessment.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))
          ) : (
            <EmptyState
              title="No findings returned"
              description="The latest backend assessment did not return findings."
            />
          )
        ) : (
          <EmptyState
            title="Assessment findings are unavailable"
            description="Run an assessment to see application-generated findings."
          />
        )}
      </section>

      <section id="source-evidence" className="scroll-mt-24 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-blue-700" aria-hidden="true" />
            <h2 className="font-semibold text-slate-950">
              Evidence and source data
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Original project updates and production records returned by the
            Evidence API.
          </p>
        </div>
        {evidenceQuery.isPending ? (
          <LoadingState label="Loading source evidence…" />
        ) : evidenceQuery.error ? (
          <ErrorState
            message={getApiErrorMessage(
              evidenceQuery.error,
              "Could not load source evidence.",
            )}
            onRetry={() => evidenceQuery.refetch()}
          />
        ) : evidenceQuery.data ? (
          <>
            {evidenceQuery.data.totalEvidence === 0 ? (
              <EmptyState
                title="No evidence is available"
                description="The Evidence API returned no project updates or production records."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="font-semibold text-slate-900">
                      Project updates
                    </h3>
                    <span className="text-xs text-slate-500">
                      {evidenceQuery.data.updates.length} records
                    </span>
                  </div>
                  {evidenceQuery.data.updates.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No project updates returned.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {evidenceQuery.data.updates.map((update) => (
                        <li key={update.updateId} className="p-4">
                          <div className="flex flex-col justify-between gap-1 sm:flex-row">
                            <p className="font-semibold text-slate-900">
                              {update.sourceName}
                            </p>
                            <time className="text-xs text-slate-500">
                              {formatDateTime(update.timestamp)}
                            </time>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {update.message}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {update.sourceType} · Update ID {update.updateId}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="font-semibold text-slate-900">
                      Production and operational records
                    </h3>
                    <span className="text-xs text-slate-500">
                      {evidenceQuery.data.productionRecords.length} records
                    </span>
                  </div>
                  {evidenceQuery.data.productionRecords.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No production records returned.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {evidenceQuery.data.productionRecords.map((record) => (
                        <li key={record.sourceRecordId} className="p-4">
                          <div className="flex flex-col justify-between gap-1 sm:flex-row">
                            <p className="font-semibold text-slate-900">
                              {record.recordType} · {record.sourceSystem}
                            </p>
                            <time className="text-xs text-slate-500">
                              {formatDateTime(record.timestamp)}
                            </time>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Source record ID · {record.sourceRecordId}
                          </p>
                          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                            {JSON.stringify(record.payload, null, 2)}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>

      <section id="follow-up-actions" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-semibold text-slate-950">Follow-up actions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Updating an action does not automatically change the project
              assessment.
            </p>
          </div>
          <FollowUpCreateForm
            fixedProjectId={projectId}
            projectName={project.projectName}
          />
        </div>
        {followUpsQuery.isPending ? (
          <LoadingState label="Loading project follow-ups…" />
        ) : followUpsQuery.error ? (
          <ErrorState
            message={getApiErrorMessage(
              followUpsQuery.error,
              "Could not load project follow-ups.",
            )}
            onRetry={() => followUpsQuery.refetch()}
          />
        ) : followUpsQuery.data?.length ? (
          followUpsQuery.data.map((followUp) => (
            <FollowUpEditor
              key={followUp.id}
              followUp={followUp}
              projectName={project.projectName}
              finding={
                followUp.findingId
                  ? findingById.get(followUp.findingId)
                  : undefined
              }
            />
          ))
        ) : (
          <EmptyState title="No follow-up actions returned" />
        )}
      </section>

      <section
        id="assessment-history"
        className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <FileText size={17} className="text-slate-500" aria-hidden="true" />
          <h2 className="font-semibold text-slate-950">Assessment history</h2>
        </div>
        {historyQuery.isPending ? (
          <div className="p-4">
            <LoadingState label="Loading assessment history…" />
          </div>
        ) : historyQuery.error ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                historyQuery.error,
                "Could not load assessment history.",
              )}
              onRetry={() => historyQuery.refetch()}
            />
          </div>
        ) : historyQuery.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {historyQuery.data.map((historicalAssessment) => (
              <li
                key={historicalAssessment.id}
                className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <HealthBadge
                      status={historicalAssessment.overallStatus}
                      size="sm"
                    />
                    <ConfidenceBadge
                      confidence={historicalAssessment.confidenceLevel}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Assessed{" "}
                    {formatDateTime(historicalAssessment.assessmentDate)} · as
                    of {formatDate(historicalAssessment.asOfDate)}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {historicalAssessment.findings.length} finding(s)
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <EmptyState title="No assessment history returned" />
          </div>
        )}
      </section>
    </div>
  );
}
