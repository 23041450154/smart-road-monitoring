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
          <div className="mb-2">
            <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/70 px-2 py-0.5 text-xs font-medium text-zinc-600">
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

const statusConfig: Record<TrafficStatus, { bg: string; text: string; border: string; dot: string }> = {
  LANCAR: {
    bg: "bg-emerald-50/80",
    text: "text-emerald-700",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  SEDANG: {
    bg: "bg-amber-50/80",
    text: "text-amber-700",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
  },
  PADAT: {
    bg: "bg-orange-50/80",
    text: "text-orange-700",
    border: "border-orange-200/80",
    dot: "bg-orange-500",
  },
  MACET: {
    bg: "bg-rose-50/80",
    text: "text-rose-700",
    border: "border-rose-200/80",
    dot: "bg-rose-500",
  },
};

export function StatusBadge({ status }: { status: TrafficStatus }) {
  const config = statusConfig[status] ?? {
    bg: "bg-zinc-50",
    text: "text-zinc-700",
    border: "border-zinc-200",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide",
        config.bg,
        config.text,
        config.border,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
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
      ? "text-rose-600 bg-rose-50 border-rose-200/70"
      : trend === "MENURUN"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200/70"
      : "text-zinc-600 bg-zinc-50 border-zinc-200/70";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
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
}: {
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-5 text-rose-900 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-sm font-semibold text-rose-900">
            Koneksi Data Terputus
          </strong>
          <p className="mt-1 text-xs text-rose-700 leading-relaxed">{message}</p>
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
