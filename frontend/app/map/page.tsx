"use client";

import { Camera as CameraIcon, Construction, Route as RouteIcon } from "lucide-react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { ErrorState, PageHeading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Camera, Pothole, Route, TrafficCurrent } from "@/lib/types";

export default function MapPage() {
  const { data: cameras, error } = useSWR<Camera[]>("/api/cameras", fetcher);
  const { data: potholes } = useSWR<Pothole[]>("/api/potholes", fetcher);
  const { data: routes } = useSWR<Route[]>("/api/routes", fetcher);
  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher);
  return <>
    <PageHeading eyebrow="Peta kondisi jalan" title="Palembang dalam satu peta" description="Lihat hubungan kamera, titik jalan berlubang, dan rute perjalanan yang tersimpan." />
    {error ? <ErrorState /> : <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-xl"><div className="flex flex-wrap gap-4 border-b border-black/7 px-5 py-3 text-xs font-bold"><span className="flex items-center gap-2"><i className="size-3 rounded bg-[#123c33]" /><CameraIcon size={14} /> CCTV ({cameras?.length ?? 0})</span><span className="flex items-center gap-2"><i className="size-3 rounded bg-[#ff7849]" /><Construction size={14} /> Lubang ({potholes?.length ?? 0})</span><span className="flex items-center gap-2"><i className="size-3 rounded bg-[#376aff]" /><RouteIcon size={14} /> Rute ({routes?.length ?? 0})</span></div><div className="h-[68vh] min-h-[480px]"><MapPanel cameras={cameras} potholes={potholes} routes={routes} traffic={traffic} /></div></div>}
  </>;
}
