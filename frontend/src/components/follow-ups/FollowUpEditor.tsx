"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useFollowUpHistory, useUpdateFollowUp } from "@/hooks/useFollowUps";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDateTime, toDateInputValue } from "@/lib/utils/formatting";
import { FollowUp, FollowUpStatus, ProjectFinding } from "@/types";

const statuses: FollowUpStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export function FollowUpEditor({
  followUp,
  finding,
  projectName,
}: {
  followUp: FollowUp;
  finding?: ProjectFinding;
  projectName?: string;
}) {
  const [status, setStatus] = useState(followUp.status);
  const [owner, setOwner] = useState(followUp.owner ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(followUp.dueDate));
  const [statusNotes, setStatusNotes] = useState("");
  const updateFollowUp = useUpdateFollowUp();
  const historyQuery = useFollowUpHistory(followUp.id);

  useEffect(() => {
    setStatus(followUp.status);
    setOwner(followUp.owner ?? "");
    setDueDate(toDateInputValue(followUp.dueDate));
    setStatusNotes("");
  }, [followUp.dueDate, followUp.owner, followUp.status]);

  const hasChanges =
    status !== followUp.status ||
    owner !== (followUp.owner ?? "") ||
    dueDate !== toDateInputValue(followUp.dueDate);

  const save = () => {
    const statusChanged = status !== followUp.status;
    if (statusChanged && !statusNotes.trim()) return;
    updateFollowUp.mutate({
      id: followUp.id,
      data: {
        status,
        owner: owner.trim() || null,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
        ...(statusChanged ? { notes: statusNotes.trim() } : {}),
      },
    });
  };

  const statusChanged = status !== followUp.status;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {projectName ?? "Project"}
          </p>
          <h3 className="mt-1 break-words font-semibold text-slate-950">
            {followUp.title}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {followUp.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {finding ? (
              <>
                <span className="text-xs text-slate-500">
                  Related finding · {finding.title}
                </span>
                <SeverityBadge severity={finding.severity} />
              </>
            ) : followUp.findingId ? (
              <span className="text-xs text-slate-500">
                Related finding ID · {followUp.findingId}
              </span>
            ) : (
              <span className="text-xs text-slate-500">No linked finding</span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Created {formatDateTime(followUp.createdAt)} · Updated{" "}
            {formatDateTime(followUp.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <label className="block text-xs font-medium text-slate-600">
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as FollowUpStatus)
            }
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Owner
          <input
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Unassigned"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      {status === "RESOLVED" && followUp.status !== "RESOLVED" && (
        <p className="mt-3 text-xs text-amber-800">
          Resolving this action does not change the project assessment. Run a
          new assessment to evaluate current evidence.
        </p>
      )}
      {statusChanged && (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Status change notes <span className="text-red-700">*</span>
          <textarea
            value={statusNotes}
            onChange={(event) => setStatusNotes(event.target.value)}
            rows={3}
            placeholder="Explain why the status changed"
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      )}
      {updateFollowUp.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {getApiErrorMessage(
            updateFollowUp.error,
            "Could not update this follow-up.",
          )}
        </p>
      )}
      {updateFollowUp.isSuccess && (
        <p role="status" className="mt-3 text-sm text-green-700">
          Follow-up updated.
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={
            !hasChanges ||
            updateFollowUp.isPending ||
            (statusChanged && !statusNotes.trim())
          }
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={15} aria-hidden="true" />
          {updateFollowUp.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <details className="mt-4 border-t border-slate-100 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Status history
        </summary>
        {historyQuery.isPending ? (
          <p className="mt-3 text-xs text-slate-500">Loading history…</p>
        ) : historyQuery.error ? (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {getApiErrorMessage(historyQuery.error, "Could not load status history.")}
          </p>
        ) : historyQuery.data?.length ? (
          <ol className="mt-3 space-y-2">
            {historyQuery.data.map((entry) => (
              <li key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-900">
                  {entry.fromStatus.replace(/_/g, " ")}
                </span>
                {" → "}
                <span className="font-medium text-slate-900">
                  {entry.toStatus.replace(/_/g, " ")}
                </span>
                <span className="ml-2">{formatDateTime(entry.changedAt)}</span>
                {entry.notes && <p className="mt-1">{entry.notes}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No status changes recorded.</p>
        )}
      </details>
    </article>
  );
}
