"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/PageStates";
import { evidenceApi } from "@/lib/api/evidence.api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { projectsApi } from "@/lib/api/projects.api";
import { formatDateTime } from "@/lib/utils/formatting";

export default function EvidencePage() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.listAll(),
  });
  const projectId = selectedProjectId || projectsQuery.data?.[0]?.id || "";
  const evidenceQuery = useQuery({
    queryKey: ["project-evidence", projectId],
    queryFn: () => evidenceApi.getProjectEvidence(projectId),
    enabled: Boolean(projectId),
  });

  if (projectsQuery.isPending)
    return <LoadingState label="Loading project list…" />;
  if (projectsQuery.error) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          projectsQuery.error,
          "Could not load projects.",
        )}
        onRetry={() => projectsQuery.refetch()}
      />
    );
  }
  if (!projectsQuery.data?.length) {
    return (
      <EmptyState
        title="No projects available"
        description="Evidence can be viewed after projects are returned by the Projects API."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Database size={17} aria-hidden="true" />
          Source traceability
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Evidence
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          View source updates and production records returned by the Evidence
          API.
        </p>
      </header>

      <label className="block max-w-xl text-sm font-medium text-slate-700">
        Project
        <select
          value={projectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          {projectsQuery.data.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName} ({project.projectId})
            </option>
          ))}
        </select>
      </label>

      {evidenceQuery.isPending ? (
        <LoadingState label="Loading evidence…" />
      ) : evidenceQuery.error ? (
        <ErrorState
          message={getApiErrorMessage(
            evidenceQuery.error,
            "Could not load project evidence.",
          )}
          onRetry={() => evidenceQuery.refetch()}
        />
      ) : evidenceQuery.data ? (
        evidenceQuery.data.totalEvidence === 0 ? (
          <EmptyState
            title="No evidence returned"
            description="The Evidence API returned no updates or production records for this project."
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-950">
                  Project updates
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {evidenceQuery.data.updates.length} source update(s)
                </p>
              </div>
              {evidenceQuery.data.updates.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  No project updates returned.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {evidenceQuery.data.updates.map((update) => (
                    <li key={update.updateId} className="p-5">
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
                      <p className="mt-3 text-xs text-slate-500">
                        Source type · {update.sourceType}{" "}
                        <span className="px-1">·</span> Update ID ·{" "}
                        {update.updateId}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-950">
                  Production and operational records
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {evidenceQuery.data.productionRecords.length} source record(s)
                </p>
              </div>
              {evidenceQuery.data.productionRecords.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  No production records returned.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {evidenceQuery.data.productionRecords.map((record) => (
                    <li key={record.sourceRecordId} className="p-5">
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
                      <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                        {JSON.stringify(record.payload, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )
      ) : null}
    </div>
  );
}
