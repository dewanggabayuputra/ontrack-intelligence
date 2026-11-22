"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, FileText } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/PageStates";
import { importsApi } from "@/lib/api/imports.api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils/formatting";
import { ImportResult } from "@/types";

type ImportKind =
  "project-master" | "project-updates" | "production-data" | "data-dictionary";

const importOptions: Array<{
  kind: ImportKind;
  title: string;
  description: string;
  accept: string;
}> = [
  {
    kind: "project-master",
    title: "Project Master",
    description: "Import project context from a CSV file.",
    accept: ".csv,text/csv",
  },
  {
    kind: "project-updates",
    title: "Project Updates",
    description: "Import reported progress and status updates from CSV.",
    accept: ".csv,text/csv",
  },
  {
    kind: "production-data",
    title: "Production Data",
    description:
      "Import deployment, incident, and performance evidence from JSON.",
    accept: ".json,application/json",
  },
  {
    kind: "data-dictionary",
    title: "Data Dictionary PDF",
    description: "Store a PDF reference. The file is not parsed or extracted.",
    accept: ".pdf,application/pdf",
  },
];

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const historyQuery = useQuery({
    queryKey: ["import-history"],
    queryFn: () => importsApi.getHistory(),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      kind,
      file,
    }: {
      kind: ImportKind;
      file: File;
    }): Promise<ImportResult | null> => {
      switch (kind) {
        case "project-master":
          return importsApi.uploadProjectMaster(file);
        case "project-updates":
          return importsApi.uploadProjectUpdates(file);
        case "production-data":
          return importsApi.uploadProductionData(file);
        case "data-dictionary":
          return importsApi.uploadDataDictionaryPdf(file);
      }
    },
    onSuccess: async (result, variables) => {
      setMessage(
        variables.kind === "data-dictionary"
          ? "Data Dictionary PDF stored successfully."
          : `${result?.recordsImported ?? 0} imported · ${result?.recordsSkipped ?? 0} skipped · ${result?.recordsFailed ?? 0} failed.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["import-history"] });
      if (variables.kind !== "data-dictionary") {
        await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      }
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <FileUp size={17} aria-hidden="true" />
          Source ingestion
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Imports
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Import source data and review the results returned by the backend.
        </p>
      </header>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900"
        >
          {message}
        </div>
      )}
      {uploadMutation.isError && (
        <ErrorState
          message={getApiErrorMessage(uploadMutation.error, "Import failed.")}
        />
      )}

      <section
        aria-label="Available imports"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {importOptions.map((option) => (
          <article
            key={option.kind}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <FileText size={19} aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-semibold text-slate-950">
              {option.title}
            </h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-slate-600">
              {option.description}
            </p>
            <label className="mt-5 block">
              <span className="sr-only">Choose {option.title} file</span>
              <input
                type="file"
                accept={option.accept}
                disabled={uploadMutation.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadMutation.mutate({ kind: option.kind, file });
                  event.target.value = "";
                  setMessage(null);
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-800 disabled:opacity-50"
              />
            </label>
            {uploadMutation.isPending &&
              uploadMutation.variables?.kind === option.kind && (
                <p
                  role="status"
                  className="mt-3 text-xs font-medium text-blue-700"
                >
                  Uploading…
                </p>
              )}
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Import history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Batch status and record counts are sourced from the Imports API.
          </p>
        </div>
        {historyQuery.isPending ? (
          <div className="p-4">
            <LoadingState label="Loading import history…" />
          </div>
        ) : historyQuery.error ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                historyQuery.error,
                "Could not load import history.",
              )}
              onRetry={() => historyQuery.refetch()}
            />
          </div>
        ) : historyQuery.data?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Processed</th>
                  <th className="px-5 py-3">Imported</th>
                  <th className="px-5 py-3">Skipped / failed</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Attachment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyQuery.data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="max-w-xs break-words text-sm font-medium text-slate-900">
                        {item.fileName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.batchName ?? "Import batch"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.status}
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                      {item.recordsProcessed}
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                      {item.recordsImported}
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                      {item.recordsSkipped} / {item.recordsFailed}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {item.batchName === "DATA_DICTIONARY_PDF" &&
                      item.status === "COMPLETED" ? (
                        <a
                          href={importsApi.getDataDictionaryFileUrl(item.id)}
                          className="font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState title="No import history returned" />
          </div>
        )}
      </section>
    </div>
  );
}
