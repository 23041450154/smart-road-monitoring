"use client";

import { useState } from "react";
import { ArrowLeft, Bike, Bus, Car, Clock3, Radio, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { MapPanel } from "@/components/map-panel";
import { API_URL, fetcher } from "@/lib/api";

import type { Camera, Snapshot, TrafficCurrent } from "@/lib/types";
import { dateTime } from "@/lib/utils";

export default function CameraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [streamKey, setStreamKey] = useState(0);
  const { data: camera, error } = useSWR<Camera>(`/api/cameras/${id}`, fetcher);
  const { data: current } = useSWR<TrafficCurrent>(`/api/cameras/${id}/traffic/current`, fetcher, { refreshInterval: 10_000 });
  const { data: history } = useSWR<Snapshot[]>(`/api/cameras/${id}/traffic/history?hours=24`, fetcher, { refreshInterval: 60_000 });
  if (error) return <ErrorState message="Kamera tidak ditemukan atau API belum berjalan." />;
  if (!camera || !current) return <div className="skeleton h-[70vh] rounded-3xl" />;
  const vehicles = [
    ["Motor", current.motorcycle_count, Bike], ["Mobil", current.car_count, Car], ["Bus", current.bus_count, Bus], ["Truk", current.truck_count, Truck],
  ] as const;
  return <>
    <Link href="/cctv" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#64726e] hover:text-[#10201d]"><ArrowLeft size={15} /> Kembali ke semua CCTV</Link>
    <PageHeading eyebrow={camera.is_demo ? "Feed lokal · demo" : "Live Streaming · Diskominfo Palembang"} title={camera.name} description={`${camera.road_name} · pembaruan ${dateTime(current.timestamp)}`} action={<div className="flex items-center gap-2"><StatusBadge status={current.traffic_status} /><TrendView trend={current.trend} /></div>} />
    <div className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
      <div className="overflow-hidden rounded-2xl bg-[#0c1d1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
          <span className="inline-flex items-center gap-2 text-xs font-bold">
            <Radio size={13} className="text-[#c9f260]" /> LIVE PROCESSING
          </span>
          <span className="font-mono text-[10px] text-white/45">YOLO · BYTETRACK · CPU READY</span>
        </div>
        <div className="relative aspect-video overflow-hidden bg-black">
          {/* Live Video Stream with Real YOLO Annotations & Tracking from Backend */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={streamKey}
            src={`${API_URL}/api/cameras/${camera.id}/stream/video?v=${streamKey}`}
            alt={`Live stream ${camera.name}`}
            className="h-full w-full object-cover"
            onError={() => {
              setTimeout(() => setStreamKey((k) => k + 1), 1200);
            }}
          />
          <p className="pointer-events-none absolute bottom-8 left-3 rounded bg-black/60 px-2 py-1 text-[9px] text-white/80">
            {camera.is_demo ? "Feed demo aktif · YOLOv11 & ByteTrack real-time" : "Live Stream Diskominfo Palembang · YOLOv11 & ByteTrack real-time"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-1">
        <div className="col-span-2 rounded-2xl bg-[#c9f260] p-4 sm:p-5 xl:col-span-1">
          <p className="text-xs font-bold opacity-55">Arus lima menit</p>
          <strong className="display mt-1 block text-3xl sm:text-5xl">{current.rolling_5_minute}</strong>
          <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-xs font-bold">
            <span>{current.vehicles_per_minute} kend./menit</span>
            <TrendView trend={current.trend} />
          </div>
        </div>
        {vehicles.map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-black/8 bg-[#fffef9] p-3 sm:p-4">
            <Icon size={16} className="mb-2 sm:mb-4 text-[#64726e]" />
            <strong className="display text-2xl sm:text-3xl block">{value}</strong>
            <p className="text-[11px] text-[#64726e]">{label}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="min-w-0 rounded-2xl border border-black/8 bg-[#fffef9] p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex items-center gap-2">
          <Clock3 size={18} />
          <h2 className="text-sm sm:text-base font-bold">Volume kendaraan · 24 jam</h2>
        </div>
        <div className="h-60 sm:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
            <AreaChart data={history ?? []} margin={{ left: -25 }}>
              <defs>
                <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#123c33" stopOpacity=".28" />
                  <stop offset="1" stopColor="#123c33" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e3e5dd" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value: string) => {
                  try {
                    const d = new Date(value);
                    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                  } catch {
                    return "";
                  }
                }}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(value) => dateTime(String(value))}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Area
                dataKey="total_count"
                name="Kendaraan"
                type="monotone"
                stroke="#123c33"
                strokeWidth={2.5}
                fill="url(#trafficFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-md">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lokasi Kamera di Peta
          </h3>
          <p className="text-sm font-bold text-slate-800">{camera.name}</p>
          <p className="text-xs text-slate-500">{camera.road_name}</p>
        </div>
        <div className="h-60 sm:h-72 w-full">
          <MapPanel
            cameras={[camera]}
            traffic={current ? [current] : []}
            showPotholeLayer={false}
            showRouteLayer={false}
            showLegend={false}
            initialCenter={[camera.latitude, camera.longitude]}
            initialZoom={15}
          />
        </div>
      </div>
    </div>
  </>;
}

