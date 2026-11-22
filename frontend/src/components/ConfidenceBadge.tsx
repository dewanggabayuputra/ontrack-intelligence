import { Confidence } from "@/types";

const confidenceClasses: Record<Confidence, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-800",
  HIGH: "border-indigo-200 bg-indigo-50 text-indigo-800",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${confidenceClasses[confidence]}`}
    >
      Confidence: {confidence}
    </span>
  );
}
