import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import type { TrafficStatus, Trend } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {eyebrow}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-zinc-500 leading-relaxed">
          {description}
        </p>
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

const statusConfig: Record<TrafficStatus, { text: string; dot: string }> = {
  LANCAR: {
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  SEDANG: {
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  PADAT: {
    text: "text-orange-600",
    dot: "bg-orange-500",
  },
  MACET: {
    text: "text-rose-600",
    dot: "bg-rose-500",
  },
};

export function StatusBadge({ status }: { status: TrafficStatus }) {
  const config = statusConfig[status] ?? {
    text: "text-zinc-600",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide",
        config.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
      {status}
    </span>
  );
}

export function TrendView({ trend }: { trend: Trend }) {
  const Icon =
    trend === "MENINGKAT"
      ? ArrowUpRight
      : trend === "MENURUN"
      ? ArrowDownRight
      : ArrowRight;

  const colorClass =
    trend === "MENINGKAT"
      ? "text-rose-600"
      : trend === "MENURUN"
      ? "text-emerald-600"
      : "text-zinc-500";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        colorClass,
      )}
    >
      <Icon size={13} className="shrink-0" />
      <span>{trend}</span>
    </span>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-28 rounded-xl border border-zinc-200/60"
        />
      ))}
    </div>
  );
}

export function ErrorState({
  message = "Data belum dapat dimuat. Pastikan backend FastAPI sudah berjalan.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-5 text-rose-900 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-semibold text-rose-900">
              Koneksi Data Terputus
            </strong>
            <p className="mt-1 text-xs text-rose-700 leading-relaxed">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition cursor-pointer"
          >
            Coba Muat Ulang
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-xs">
      <RefreshCw size={20} className="mx-auto mb-2.5 text-zinc-400" />
      <strong className="block text-sm font-medium text-zinc-800">{title}</strong>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}
