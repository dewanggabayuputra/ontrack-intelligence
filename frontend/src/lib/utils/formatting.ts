import { format, formatDistance, isValid, parseISO } from "date-fns";

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "MMM d, yyyy") : "—";
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "MMM d, yyyy, HH:mm") : "—";
}

export function formatRelativeTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) return "—";
  const date = parseISO(dateString);
  return isValid(date)
    ? formatDistance(date, new Date(), { addSuffix: true })
    : "—";
}

export function formatPercentage(
  value: number | string | null | undefined,
): string {
  if (value === undefined || value === null || value === "") return "—";
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(numericValue)}%`
    : "—";
}

export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value === undefined || value === null || value === "") return "—";
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
        numericValue,
      )
    : "—";
}

export function formatValue(value: string | number | null | undefined): string {
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function toDateInputValue(dateString: string | null): string {
  if (!dateString) return "";
  const date = parseISO(dateString);
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}
