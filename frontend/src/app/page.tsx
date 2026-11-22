"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  CircleHelp,
  Search,
  ShieldAlert,
} from "lucide-react";
import { HealthBadge } from "@/components/HealthBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/PageStates";
import { usePortfolio } from "@/hooks/usePortfolio";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  formatDate,
  formatPercentage,
  formatValue,
} from "@/lib/utils/formatting";
import { HealthStatus, PortfolioEntry, Severity } from "@/types";

type HealthFilter = HealthStatus | "NOT_ASSESSED" | "ALL";
type PortfolioSort =
  "deadline-asc" | "deadline-desc" | "progress-desc" | "progress-asc";

const severityRank: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const severityStyles: Record<Severity, string> = {
  CRITICAL: "bg-red-50 text-red-800 ring-red-200",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-200",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
  LOW: "bg-blue-50 text-blue-800 ring-blue-200",
};

function highestSeverity(entry: PortfolioEntry): Severity | null {
  const findings = entry.assessment?.findings ?? [];
  return findings.reduce<Severity | null>((highest, finding) => {
    if (!highest || severityRank[finding.severity] > severityRank[highest]) {
      return finding.severity;
    }
    return highest;
  }, null);
}

function highestSeverityRank(entry: PortfolioEntry): number {
  const severity = highestSeverity(entry);
  return severity ? severityRank[severity] : 0;
}

function numericValue(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function PortfolioTable({ entries }: { entries: PortfolioEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No projects match these filters"
        description="Try a different search term or clear one of the filters."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1050px] w-full text-left">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Project</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Manager / PIC</th>
            <th className="px-5 py-3">Reported progress</th>
            <th className="px-5 py-3">Reported status</th>
            <th className="px-5 py-3">Assessed health</th>
            <th className="px-5 py-3">Highest finding</th>
            <th className="px-5 py-3">Last updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const { project, assessment } = entry;
            const severity = highestSeverity(entry);
            return (
              <tr key={project.id} className="align-top hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link
                    href={`/projects/${encodeURIComponent(project.id)}`}
                    className="font-semibold text-slate-900 hover:text-blue-700"
                  >
                    {project.projectName}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {project.projectId}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  {formatValue(project.customer)}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  {formatValue(project.pic)}
                </td>
                <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                  {formatPercentage(project.reportedProgressPct)}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  {formatValue(project.reportedStatus)}
                </td>
                <td className="px-5 py-4">
                  {assessment ? (
                    <HealthBadge status={assessment.overallStatus} size="sm" />
                  ) : (
                    <span className="text-sm text-slate-500">Not assessed</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {severity ? (
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${severityStyles[severity]}`}
                    >
                      {severity}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {formatDate(
                    project.lastReportedUpdateAt ?? project.updatedAt,
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PortfolioPage() {
  const { data = [], isPending, error, refetch, isFetching } = usePortfolio();
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("ALL");
  const [projectTypeFilter, setProjectTypeFilter] = useState("ALL");
  const [sort, setSort] = useState<PortfolioSort>("deadline-asc");

  const counts = useMemo(
    () => ({
      total: data.length,
      healthy: data.filter(
        (entry) => entry.assessment?.overallStatus === "HEALTHY",
      ).length,
      atRisk: data.filter(
        (entry) => entry.assessment?.overallStatus === "AT_RISK",
      ).length,
      needsAttention: data.filter(
        (entry) => entry.assessment?.overallStatus === "NEEDS_ATTENTION",
      ).length,
      insufficient: data.filter(
        (entry) => entry.assessment?.overallStatus === "INSUFFICIENT_DATA",
      ).length,
      unassessed: data.filter((entry) => !entry.assessment).length,
    }),
    [data],
  );

  const projectTypes = useMemo(
    () =>
      [
        ...new Set(
          data
            .map(({ project }) => project.projectType)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [data],
  );

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = data.filter(({ project, assessment }) => {
      const matchesSearch =
        !normalizedSearch ||
        project.projectName.toLowerCase().includes(normalizedSearch) ||
        project.projectId.toLowerCase().includes(normalizedSearch);
      const matchesHealth =
        healthFilter === "ALL" ||
        (healthFilter === "NOT_ASSESSED"
          ? !assessment
          : assessment?.overallStatus === healthFilter);
      const matchesType =
        projectTypeFilter === "ALL" ||
        project.projectType === projectTypeFilter;
      return matchesSearch && matchesHealth && matchesType;
    });

    return filtered.sort((a, b) => {
      if (sort.startsWith("deadline")) {
        if (!a.project.deadline && !b.project.deadline) return 0;
        if (!a.project.deadline) return 1;
        if (!b.project.deadline) return -1;
        const left = new Date(a.project.deadline).getTime();
        const right = new Date(b.project.deadline).getTime();
        return sort === "deadline-asc" ? left - right : right - left;
      }

      const left = numericValue(a.project.reportedProgressPct);
      const right = numericValue(b.project.reportedProgressPct);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return sort === "progress-desc" ? right - left : left - right;
    });
  }, [data, healthFilter, projectTypeFilter, search, sort]);

  const attentionEntries = useMemo(
    () =>
      data
        .filter(
          ({ assessment }) =>
            assessment &&
            (assessment.requiresAttention ||
              assessment.findings.some(
                (finding) =>
                  finding.severity === "CRITICAL" ||
                  finding.severity === "HIGH",
              )),
        )
        .sort((a, b) => {
          const severityDifference =
            highestSeverityRank(b) - highestSeverityRank(a);
          if (severityDifference !== 0) return severityDifference;
          return (
            Number(b.assessment?.requiresAttention) -
            Number(a.assessment?.requiresAttention)
          );
        })
        .slice(0, 5),
    [data],
  );

  if (isPending) return <LoadingState label="Loading project portfolio…" />;
  if (error) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          error,
          "Could not load the project portfolio.",
        )}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Portfolio overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Project intelligence
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review reported project information alongside the latest backend
            assessment and its evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <Activity size={16} aria-hidden="true" />
          {isFetching ? "Refreshing…" : "Refresh portfolio"}
        </button>
      </header>

      <section
        aria-label="Portfolio summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <MetricCard
          label="Total projects"
          value={counts.total}
          icon={Activity}
        />
        <MetricCard
          label="Healthy"
          value={counts.healthy}
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="At risk"
          value={counts.atRisk}
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          label="Needs attention"
          value={counts.needsAttention}
          icon={ShieldAlert}
          tone="red"
        />
        <MetricCard
          label="Insufficient data"
          value={counts.insufficient}
          icon={CircleHelp}
          tone="slate"
          detail={`${counts.unassessed} project(s) have no assessment yet`}
        />
      </section>

      <section
        aria-labelledby="attention-heading"
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 id="attention-heading" className="font-semibold text-slate-950">
              Attention overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Projects are ordered by the highest severity returned in their
              latest assessment.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Backend assessment data
          </span>
        </div>
        {attentionEntries.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No assessed projects currently require attention" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attentionEntries.map((entry) => {
              const severity = highestSeverity(entry);
              return (
                <li
                  key={entry.project.id}
                  className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${encodeURIComponent(entry.project.id)}`}
                      className="font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {entry.project.projectName}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      {entry.assessment?.findings.length ?? 0} finding(s) ·
                      assessed {formatDate(entry.assessment?.assessmentDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.project.projectId}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.assessment && (
                      <HealthBadge
                        status={entry.assessment.overallStatus}
                        size="sm"
                      />
                    )}
                    {severity && (
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${severityStyles[severity]}`}
                      >
                        Highest severity · {severity}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="portfolio-table-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center">
          <div>
            <h2
              id="portfolio-table-heading"
              className="font-semibold text-slate-950"
            >
              Project portfolio
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredEntries.length} of {data.length} projects
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            <label className="relative block">
              <span className="sr-only">Search by project name or ID</span>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search project…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-52"
              />
            </label>
            <label>
              <span className="sr-only">Filter by assessed health status</span>
              <select
                value={healthFilter}
                onChange={(event) =>
                  setHealthFilter(event.target.value as HealthFilter)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-48"
              >
                <option value="ALL">All health statuses</option>
                <option value="HEALTHY">Healthy</option>
                <option value="AT_RISK">At risk</option>
                <option value="NEEDS_ATTENTION">Needs attention</option>
                <option value="INSUFFICIENT_DATA">Insufficient data</option>
                <option value="NOT_ASSESSED">Not assessed</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by project type</span>
              <select
                value={projectTypeFilter}
                onChange={(event) => setProjectTypeFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-44"
              >
                <option value="ALL">All project types</option>
                {projectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative block">
              <ArrowDownUp
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <span className="sr-only">Sort projects</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as PortfolioSort)
                }
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm sm:w-48"
              >
                <option value="deadline-asc">Deadline · earliest</option>
                <option value="deadline-desc">Deadline · latest</option>
                <option value="progress-desc">
                  Reported progress · high to low
                </option>
                <option value="progress-asc">
                  Reported progress · low to high
                </option>
              </select>
            </label>
          </div>
        </div>
        {data.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No projects available"
              description="Projects will appear here after they are returned by the Projects API."
            />
          </div>
        ) : (
          <PortfolioTable entries={filteredEntries} />
        )}
      </section>
    </div>
  );
}
