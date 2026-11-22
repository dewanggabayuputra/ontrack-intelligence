/**
 * Health Status Badge Component
 */

import { HealthStatus } from "@/types";

interface HealthBadgeProps {
  status: HealthStatus;
  size?: "sm" | "md" | "lg";
}

const colorMap: Record<HealthStatus, string> = {
  HEALTHY: "bg-green-100 text-green-800 border border-green-300",
  AT_RISK: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  NEEDS_ATTENTION: "bg-red-100 text-red-800 border border-red-300",
  INSUFFICIENT_DATA: "bg-gray-100 text-gray-800 border border-gray-300",
};

const sizeMap: Record<string, string> = {
  sm: "px-2 py-1 text-xs font-medium rounded",
  md: "px-3 py-1.5 text-sm font-medium rounded",
  lg: "px-4 py-2 text-base font-semibold rounded-lg",
};

const labelMap: Record<HealthStatus, string> = {
  HEALTHY: "✓ Healthy",
  AT_RISK: "⚠ At Risk",
  NEEDS_ATTENTION: "✗ Needs Attention",
  INSUFFICIENT_DATA: "? Insufficient Data",
};

export function HealthBadge({ status, size = "md" }: HealthBadgeProps) {
  return (
    <span
      aria-label={`Assessed health: ${labelMap[status]}`}
      className={`${colorMap[status]} ${sizeMap[size]}`}
    >
      {labelMap[status]}
    </span>
  );
}
