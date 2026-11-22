import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
  detail?: string;
}

const toneClasses = {
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  detail,
}: MetricCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`rounded-lg p-2.5 ring-1 ${toneClasses[tone]}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}
