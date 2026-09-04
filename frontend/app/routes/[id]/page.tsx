"use client";

import { ArrowLeft, Construction, Edit3, MapPin, MessageSquareText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { RouteEditor } from "@/components/route-editor";
import { ErrorState, PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import type { Briefing, Camera, Route } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { data: route, error } = useSWR<Route>(`/api/routes/${id}`, fetcher);
  const { data: briefing } = useSWR<Briefing>(`/api/routes/${id}/briefing`, fetcher, { refreshInterval: 30_000 });
  const { data: cameras } = useSWR<Camera[]>("/api/cameras", fetcher);
  async function remove() { if (!confirm("Hapus rute ini?")) return; await mutateApi(`/api/routes/${id}`, "DELETE"); router.push("/routes"); }
  if (error) return <ErrorState message="Rute tidak ditemukan." />;
  if (!route || !briefing) return <div className="skeleton h-[70vh] rounded-3xl" />;
  if (editing) return <RouteEditor route={route} onCancel={() => setEditing(false)} />;
  return <>
    <Link href="/routes" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#64726e]"><ArrowLeft size={15} /> Semua rute</Link>
    <PageHeading eyebrow={routeLabel(route.route_type)} title={route.name} description={`${route.path.length} titik geometri · buffer CCTV 500 m · buffer lubang 100 m`} action={<div className="flex gap-2"><button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-bold"><Edit3 size={15} /> Edit</button><button onClick={remove} className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-700"><Trash2 size={15} /></button></div>} />
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="h-[520px] overflow-hidden rounded-2xl border border-black/8"><MapPanel routes={[route]} cameras={cameras} potholes={briefing.potholes} traffic={briefing.traffic} /></div>
      <div className="space-y-4">
        <article className="rounded-2xl bg-[#102c27] p-5 text-white"><div className="mb-5 flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><MessageSquareText size={18} /></span><StatusBadge status={briefing.overall_status} /></div><h2 className="mb-3 font-bold">Briefing perjalanan</h2><p className="whitespace-pre-line text-sm leading-7 text-white/70">{briefing.message}</p></article>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-black/8 bg-[#fffef9] p-4"><MapPin size={17} className="mb-5 text-[#64726e]" /><strong className="display text-4xl">{briefing.traffic.length}</strong><p className="text-xs text-[#64726e]">CCTV dekat rute</p></div><div className="rounded-2xl border border-black/8 bg-[#fffef9] p-4"><Construction size={17} className="mb-5 text-[#ff7849]" /><strong className="display text-4xl">{briefing.potholes.length}</strong><p className="text-xs text-[#64726e]">Lubang dekat rute</p></div></div>
        {briefing.traffic.map(item => <div key={item.camera_id} className="rounded-xl border border-black/8 bg-white p-4"><div className="flex justify-between gap-3"><div><b className="text-sm">{item.road_name}</b><p className="text-[11px] text-[#64726e]">{item.camera_name}</p></div><StatusBadge status={item.traffic_status} /></div><div className="mt-3 flex justify-between"><span className="text-xs"><b>{item.vehicles_per_minute}</b> kend./menit</span><TrendView trend={item.trend} /></div></div>)}
      </div>
    </div>
  </>;
}
