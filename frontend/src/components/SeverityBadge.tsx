/**
 * Severity Level Badge Component
 */

import { Severity } from "@/types";

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
}

const colorMap: Record<Severity, string> = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

const iconMap: Record<Severity, string> = {
  LOW: "●",
  MEDIUM: "●",
  HIGH: "●●",
  CRITICAL: "●●●",
};

const sizeMap: Record<string, string> = {
  sm: "px-2 py-1 text-xs rounded",
  md: "px-3 py-1 text-sm rounded",
};

export function SeverityBadge({ severity, size = "sm" }: SeverityBadgeProps) {
  return (
    <span
      className={`${colorMap[severity]} ${sizeMap[size]} font-medium`}
      aria-label={`Severity: ${severity}`}
    >
      {iconMap[severity]} {severity}
    </span>
  );
}
