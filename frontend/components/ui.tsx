import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import type { TrafficStatus, Trend } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p className="mb-2 text-[10px] font-black uppercase tracking-[.23em] text-[#df5b31]">{eyebrow}</p><h1 className="display text-4xl font-black uppercase leading-none sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#64726e]">{description}</p></div>{action}
  </div>;
}

const statusStyle: Record<TrafficStatus, string> = {
  LANCAR: "bg-emerald-100 text-emerald-800",
  SEDANG: "bg-amber-100 text-amber-800",
  PADAT: "bg-orange-100 text-orange-800",
  MACET: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: TrafficStatus }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider", statusStyle[status])}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

export function TrendView({ trend }: { trend: Trend }) {
  const Icon = trend === "MENINGKAT" ? ArrowUpRight : trend === "MENURUN" ? ArrowDownRight : ArrowRight;
  return <span className={cn("inline-flex items-center gap-1 text-xs font-bold", trend === "MENINGKAT" ? "text-red-600" : trend === "MENURUN" ? "text-emerald-700" : "text-[#64726e]")}><Icon size={14} />{trend}</span>;
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;
}

export function ErrorState({ message = "Data belum dapat dimuat. Pastikan FastAPI sudah berjalan." }: { message?: string }) {
  return <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-orange-900"><AlertTriangle className="mb-3" /><strong className="block">Koneksi data terputus</strong><p className="mt-1 text-sm opacity-75">{message}</p></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-10 text-center"><RefreshCw className="mx-auto mb-3 text-[#64726e]" /><strong>{title}</strong><p className="mt-1 text-sm text-[#64726e]">{description}</p></div>;
}
