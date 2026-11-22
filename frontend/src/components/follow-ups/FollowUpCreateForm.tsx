"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCreateFollowUp } from "@/hooks/useFollowUps";
import { getApiErrorMessage } from "@/lib/api/errors";
import { FollowUpStatus, Project } from "@/types";

const statuses: FollowUpStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"];

export function FollowUpCreateForm({
  projects,
  fixedProjectId,
  projectName,
}: {
  projects?: Project[];
  fixedProjectId?: string;
  projectName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<FollowUpStatus>("OPEN");
  const [dueDate, setDueDate] = useState("");
  const createFollowUp = useCreateFollowUp();

  useEffect(() => {
    if (fixedProjectId) setProjectId(fixedProjectId);
  }, [fixedProjectId]);

  const close = () => {
    if (createFollowUp.isPending) return;
    setOpen(false);
  };

  const submit = () => {
    if (!projectId || !title.trim() || !description.trim()) return;
    createFollowUp.mutate(
      {
        projectId,
        title: title.trim(),
        description: description.trim(),
        owner: owner.trim() || null,
        status,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setOwner("");
          setStatus("OPEN");
          setDueDate("");
          setOpen(false);
        },
      },
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
      >
        <Plus size={16} aria-hidden="true" />
        Create follow-up
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Create follow-up</h2>
              <button type="button" onClick={close} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-5">
              {!fixedProjectId && (
                <label className="text-xs font-medium text-slate-600">
                  Project
                  <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select a project</option>
                    {(projects ?? []).map((project) => (
                      <option key={project.id} value={project.id}>{project.projectName}</option>
                    ))}
                  </select>
                </label>
              )}
              {fixedProjectId && <p className="text-sm text-slate-600">Project: <span className="font-medium text-slate-900">{projectName}</span></p>}
              <label className="text-xs font-medium text-slate-600">
                Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Description
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium text-slate-600">
                  Owner
                  <input value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Status
                  <select value={status} onChange={(event) => setStatus(event.target.value as FollowUpStatus)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {statuses.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Due date
                  <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              {createFollowUp.isError && (
                <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(createFollowUp.error, "Could not create follow-up.")}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={close} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={submit} disabled={!projectId || !title.trim() || !description.trim() || createFollowUp.isPending} className="rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {createFollowUp.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
