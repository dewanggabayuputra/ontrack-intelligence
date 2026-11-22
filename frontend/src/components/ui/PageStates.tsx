import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm text-slate-600"
    >
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Data could not be loaded</p>
          <p className="mt-1 break-words text-sm text-red-800">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-900 underline underline-offset-2"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <Inbox size={24} className="text-slate-400" aria-hidden="true" />
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-lg text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}
