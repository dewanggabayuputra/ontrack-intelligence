/**
 * Assessment Summary Card Component
 */

import Link from "next/link";
import { ProjectAssessment } from "@/types";
import { HealthBadge } from "./HealthBadge";
import { formatDistanceToNow } from "date-fns";

interface AssessmentCardProps {
  assessment: ProjectAssessment;
  projectName: string;
}

export function AssessmentCard({
  assessment,
  projectName,
}: AssessmentCardProps) {
  return (
    <Link href={`/projects/${assessment.projectId}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {projectName}
            </h3>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(assessment.assessmentDate), {
                addSuffix: true,
              })}
            </p>
          </div>
          <HealthBadge status={assessment.overallStatus} size="lg" />
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Schedule</div>
            <div className="text-2xl font-mono">
              {assessment.scheduleHealth === "HEALTHY" ? "✓" : "✗"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Progress</div>
            <div className="text-2xl font-mono">
              {assessment.progressHealth === "HEALTHY" ? "✓" : "✗"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Operations</div>
            <div className="text-2xl font-mono">
              {assessment.operationalHealth === "HEALTHY" ? "✓" : "✗"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Evidence</div>
            <div className="text-2xl font-mono">
              {assessment.evidenceHealth === "HEALTHY" ? "✓" : "✗"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Quality</div>
            <div className="text-2xl font-mono">
              {assessment.dataQuality === "HEALTHY" ? "✓" : "✗"}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {assessment.findings.length} findings
              </p>
              <p className="text-xs text-gray-500">
                Confidence: {assessment.confidenceLevel}
              </p>
            </div>
            {assessment.requiresAttention && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-xs font-medium">
                Action Required
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
