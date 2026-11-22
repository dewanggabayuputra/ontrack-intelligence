/**
 * Finding Card Component
 * Displays individual findings from assessment
 */

import { ProjectFinding } from "@/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SeverityBadge } from "./SeverityBadge";

interface FindingCardProps {
  finding: ProjectFinding;
  showEvidence?: boolean;
}

export function FindingCard({
  finding,
  showEvidence = true,
}: FindingCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rule category · {finding.category}
          </p>
          <h4 className="mt-1 break-words text-base font-semibold text-slate-950">
            {finding.title}
          </h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {finding.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <ConfidenceBadge confidence={finding.confidence} />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">
            Why this matters:
          </span>{" "}
          {finding.reasoning}
        </p>
        {finding.impact && (
          <p className="mt-2 text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-900">
              Potential impact:
            </span>{" "}
            {finding.impact}
          </p>
        )}
      </div>

      {finding.recommendedAction && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-950">
            <span className="font-semibold">Recommended action:</span>{" "}
            {finding.recommendedAction}
          </p>
        </div>
      )}

      {showEvidence && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Source references
          </p>
          {finding.evidenceUpdateIds.length === 0 &&
          finding.evidenceRecordIds.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No update or production-record reference was returned for this
              finding.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {finding.evidenceUpdateIds.map((id) => (
                <span
                  key={`update-${id}`}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                >
                  Update ID · {id}
                </span>
              ))}
              {finding.evidenceRecordIds.map((id) => (
                <span
                  key={`record-${id}`}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                >
                  Record ID · {id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
