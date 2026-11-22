"use client";

import { useMemo, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { FollowUpCreateForm } from "@/components/follow-ups/FollowUpCreateForm";
import { FollowUpEditor } from "@/components/follow-ups/FollowUpEditor";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/PageStates";
import { useFollowUps } from "@/hooks/useFollowUps";
import { getApiErrorMessage } from "@/lib/api/errors";
import { projectsApi } from "@/lib/api/projects.api";
import { useQuery } from "@tanstack/react-query";
import { FollowUpStatus } from "@/types";

type StatusFilter = FollowUpStatus | "ALL";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function FollowUpsPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const followUpsQuery = useFollowUps(status === "ALL" ? undefined : status);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.listAll(),
  });

  const projectBySourceId = useMemo(
    () =>
      new Map(
        (projectsQuery.data ?? []).map((project) => [
          project.projectId,
          project,
        ]),
      ),
    [projectsQuery.data],
  );
  const filteredFollowUps = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (followUpsQuery.data ?? []).filter((followUp) => {
      const relatedProjectId = followUp.project?.projectId;
      const matchesProject =
        projectFilter === "ALL" || relatedProjectId === projectFilter;
      const matchesSearch =
        !normalizedSearch ||
        followUp.title.toLowerCase().includes(normalizedSearch) ||
        followUp.description.toLowerCase().includes(normalizedSearch);
      return matchesProject && matchesSearch;
    });
  }, [followUpsQuery.data, projectFilter, search]);

  if (followUpsQuery.isPending || projectsQuery.isPending) {
    return <LoadingState label="Loading follow-up actions…" />;
  }
  if (followUpsQuery.error) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          followUpsQuery.error,
          "Could not load follow-ups.",
        )}
        onRetry={() => followUpsQuery.refetch()}
      />
    );
  }
  if (projectsQuery.error) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          projectsQuery.error,
          "Could not load project filters.",
        )}
        onRetry={() => projectsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ListChecks size={17} aria-hidden="true" />
            Action management
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Follow-ups
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Track owners, due dates, and status for actions returned by the
            backend.
          </p>
        </div>
        <FollowUpCreateForm projects={projectsQuery.data} />
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_220px_240px]">
          <label className="relative block">
            <span className="sr-only">Search follow-up description</span>
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or description…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All projects</option>
              {(projectsQuery.data ?? []).map((project) => (
                <option key={project.id} value={project.projectId}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-5 py-3 text-sm text-slate-500">
          Showing {filteredFollowUps.length} action(s)
        </div>
        <div className="space-y-3 px-4 pb-4">
          {filteredFollowUps.length === 0 ? (
            <EmptyState
              title="No follow-ups match these filters"
              description="Try another status, project, or search term."
            />
          ) : (
            filteredFollowUps.map((followUp) => {
              const project = projectBySourceId.get(
                followUp.project?.projectId ?? "",
              );
              return (
                <FollowUpEditor
                  key={followUp.id}
                  followUp={followUp}
                  projectName={
                    followUp.project?.projectName ?? project?.projectName
                  }
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
