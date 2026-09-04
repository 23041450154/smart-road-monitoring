"use client";

import { ArrowRight, Clock3, MapPin, Plus, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { RouteEditor } from "@/components/route-editor";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Route } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

export default function RoutesPage() {
  const [creating, setCreating] = useState(false);
  const { data: routes, error } = useSWR<Route[]>("/api/routes", fetcher);
  return <>
    <PageHeading eyebrow="Perjalanan personal" title="Rute Saya" description="Simpan rute berangkat dan pulang. Kamera serta titik jalan berlubang di sekitar garis rute akan dicocokkan otomatis." action={<button onClick={() => setCreating(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#102c27] px-4 py-3 text-xs font-bold text-white"><Plus size={15} /> Buat rute</button>} />
    {creating && <div className="mb-7"><RouteEditor onCancel={() => setCreating(false)} /></div>}
    {error ? <ErrorState /> : !routes ? <div className="skeleton h-40 rounded-2xl" /> : !routes.length ? <EmptyState title="Belum ada rute" description="Buat rute pertama dengan memilih titik-titik di peta." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{routes.map(route => <Link href={`/routes/${route.id}`} key={route.id} className="group rounded-2xl border border-black/8 bg-[#fffef9] p-5 shadow-[0_10px_30px_rgba(16,32,29,.04)] transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-7 flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#c9f260]"><RouteIcon size={19} /></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${route.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>{route.is_active ? "AKTIF" : "NONAKTIF"}</span></div>
      <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#df5b31]">{routeLabel(route.route_type)}</p><h2 className="mt-1 text-lg font-bold">{route.name}</h2>
      <div className="mt-4 flex items-center gap-4 text-xs text-[#64726e]"><span className="flex items-center gap-1"><MapPin size={13} />{route.path.length} titik</span><span className="flex items-center gap-1"><Clock3 size={13} />{route.notification_time?.slice(0, 5) ?? "—"}</span></div>
      <div className="mt-5 flex items-center justify-between border-t border-black/7 pt-4 text-xs font-bold">Lihat briefing <ArrowRight size={16} className="transition group-hover:translate-x-1" /></div>
    </Link>)}</div>}
  </>;
}
