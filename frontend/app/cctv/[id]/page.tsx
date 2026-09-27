"use client";

import { useState } from "react";
import { ArrowLeft, Bike, Bus, Car, Clock3, Flame, Info, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState, PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { MapPanel } from "@/components/map-panel";
import { API_URL, fetcher } from "@/lib/api";

import type {
  Camera,
  HourlyProfileItem,
  HourlyProfileResponse,
  Snapshot,
  TrafficCurrent,
  TrafficPredictionResponse,
} from "@/lib/types";
import { dateTime } from "@/lib/utils";

export default function CameraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [streamKey, setStreamKey] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number>(17);
  const { data: camera, error } = useSWR<Camera>(`/api/cameras/${id}`, fetcher);
  const { data: current } = useSWR<TrafficCurrent>(
    `/api/cameras/${id}/traffic/current`,
    fetcher,
    { refreshInterval: 10_000 },
  );
  const { data: history } = useSWR<Snapshot[]>(
    `/api/cameras/${id}/traffic/history?hours=24`,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const { data: profileData } = useSWR<HourlyProfileResponse>(
    `/api/cameras/${id}/traffic/hourly-profile`,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const { data: prediction } = useSWR<TrafficPredictionResponse>(
    `/api/cameras/${id}/traffic/predict?hour=${selectedHour}`,
    fetcher,
  );

  if (error) {
    return (
      <ErrorState message="Kamera tidak ditemukan atau layanan backend belum berjalan." />
    );
  }

  if (!camera || !current) {
    return <div className="skeleton h-[70vh] rounded-xl border border-zinc-200" />;
  }

  const vehicles = [
    ["Sepeda Motor", current.motorcycle_count, Bike],
    ["Mobil Pribadi", current.car_count, Car],
    ["Bus Angkutan", current.bus_count, Bus],
    ["Truk Logistik", current.truck_count, Truck],
  ] as const;

  return (
    <>
      <Link
        href="/cctv"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Kembali ke Direktori CCTV</span>
      </Link>

      <PageHeading
        eyebrow={camera.is_demo ? "Feed Simulasi · Demo" : "Live Streaming · Diskominfo"}
        title={camera.name}
        description={`${camera.road_name} · Pembaruan ${dateTime(current.timestamp)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={current.traffic_status} />
            <TrendView trend={current.trend} />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_.7fr]">
        {/* Live Video Feed Frame */}
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 text-white">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>LIVE VISION INFERENCE</span>
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              YOLO11 · ByteTrack · 30 FPS
            </span>
          </div>

          <div className="relative aspect-video overflow-hidden bg-black">
            {/* Live Video Stream with Real YOLO Annotations & Tracking from Backend */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API_URL}/api/cameras/${camera.id}/stream/video?v=${streamKey}`}
              alt={`Live stream ${camera.name}`}
              className="h-full w-full object-cover"
              onError={() => {
                setTimeout(() => setStreamKey((k: number) => k + 1), 1000);
              }}
            />
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-xs">
              {camera.is_demo
                ? "Feed Demo Aktif · YOLO & ByteTrack Real-time"
                : "Live Stream Diskominfo Palembang · YOLO & ByteTrack"}
            </div>
          </div>
        </div>

        {/* Realtime Metrics Column */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          {/* Main 5-Minute Volume Card */}
          <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-white shadow-xs xl:col-span-1">
            <span className="text-xs font-medium text-zinc-400 block">
              Volume Akumulasi (5 Menit)
            </span>
            <strong className="mt-2 block text-3xl sm:text-4xl font-bold tracking-tight text-white tabular">
              {current.rolling_5_minute}
            </strong>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2.5 text-xs">
              <span className="text-zinc-400">
                <b className="text-white font-semibold tabular">
                  {current.vehicles_per_minute}
                </b>{" "}
                kend./menit
              </span>
              <TrendView trend={current.trend} />
            </div>
          </div>

          {/* Vehicle Category Breakdown */}
          {vehicles.map(([label, value, Icon]) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition hover:border-zinc-300"
            >
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium text-zinc-600">{label}</span>
                <Icon size={16} className="text-zinc-400" />
              </div>
              <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
                {value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* 24h Trend Chart & Mini Map */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-zinc-600" />
              <h2 className="text-sm font-semibold text-zinc-900">
                Aktivitas Lalu Lintas (24 Jam Terakhir)
              </h2>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history ?? []} margin={{ left: -20, right: 5, top: 10 }}>
                <defs>
                  <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value: string) => {
                    try {
                      const d = new Date(value);
                      return isNaN(d.getTime())
                        ? ""
                        : d.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                    } catch {
                      return "";
                    }
                  }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => dateTime(String(value))}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  dataKey="total_count"
                  name="Kendaraan"
                  type="monotone"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#trafficFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Mini Map */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs flex flex-col">
          <div className="border-b border-zinc-100 p-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              Posisi Geografis Kamera
            </span>
            <p className="text-sm font-semibold text-zinc-900 mt-0.5">{camera.name}</p>
            <p className="text-xs text-zinc-500">{camera.road_name}</p>
          </div>
          <div className="h-60 sm:h-72 w-full flex-1">
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

      {/* AI Historical Pattern & Time-Based Prediction (Dosen Requirement) */}
      <div className="mt-6 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="text-base font-semibold text-zinc-900">
                Pola Historis & Prediksi Kepadatan per Jam
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Analisis rekaman data historis untuk memprediksi tingkat kepadatan pada jam tertentu
            </p>
          </div>

          {/* Peak hour badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {profileData?.morning_peak && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <Flame size={12} className="text-amber-600" />
                Puncak Pagi: {profileData.morning_peak}
              </span>
            )}
            {profileData?.evening_peak && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                <Flame size={12} className="text-rose-600" />
                Puncak Sore: {profileData.evening_peak}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Time Selector */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-200/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Clock3 size={14} className="text-zinc-500" />
                  Simulasi Pilihan Jam:
                </label>
                <span className="text-base font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {selectedHour.toString().padStart(2, "0")}:00 WIB
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="23"
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-200/60 flex-wrap">
                <span className="text-[11px] text-zinc-400 font-medium">Pintas Cepat:</span>
                {[
                  { label: "Pagi (07:00)", hour: 7 },
                  { label: "Siang (12:00)", hour: 12 },
                  { label: "Sore (17:00)", hour: 17 },
                  { label: "Malam (20:00)", hour: 20 },
                ].map((preset) => (
                  <button
                    key={preset.hour}
                    type="button"
                    onClick={() => setSelectedHour(preset.hour)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                      selectedHour === preset.hour
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prediction Result Card */}
            {prediction && (
              <div className="rounded-lg border border-zinc-200 p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Prediksi Status Lalu Lintas:</span>
                  <StatusBadge status={prediction.predicted_status} />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Skor Kemacetan:</span>
                    <span className="text-sm font-semibold text-zinc-800">
                      {prediction.congestion_score.toFixed(1)} / 100
                    </span>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prediction.congestion_score >= 75
                            ? "bg-rose-500"
                            : prediction.congestion_score >= 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, prediction.congestion_score)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Perkiraan Volume:</span>
                    <span className="text-sm font-semibold text-zinc-800">
                      ~{prediction.avg_vehicles_per_minute} kendaraan/mnt
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Tingkat Kepercayaan: <span className="font-medium text-zinc-600">{prediction.confidence_level}</span>
                    </span>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3 flex items-start gap-2.5">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 leading-relaxed font-normal">
                    {prediction.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 24-Hour Profile Bar Chart */}
          <div className="flex flex-col rounded-lg border border-zinc-200/80 p-4 bg-zinc-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700">
                Pola Aktivitas 24 Jam (Klik batang untuk memilih jam)
              </span>
            </div>
            <div className="h-56 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={profileData?.profile ?? []}
                  margin={{ left: -25, right: 5, top: 10, bottom: 0 }}
                  onClick={(e: unknown) => {
                    const event = e as { activePayload?: Array<{ payload: HourlyProfileItem }> };
                    if (event?.activePayload?.[0]?.payload?.hour !== undefined) {
                      setSelectedHour(event.activePayload[0].payload.hour);
                    }
                  }}
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h: number) => `${h}`}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val} kendaraan/mnt`, "Rata-rata"]}
                    labelFormatter={(h) => `Pukul ${String(h).padStart(2, "0")}:00 WIB`}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="avg_vehicles_per_minute" radius={[3, 3, 0, 0]}>
                    {(profileData?.profile ?? []).map((entry) => (
                      <Cell
                        key={`cell-${entry.hour}`}
                        cursor="pointer"
                        fill={
                          entry.hour === selectedHour
                            ? "#2563eb"
                            : entry.traffic_status === "MACET"
                            ? "#ef4444"
                            : entry.traffic_status === "PADAT"
                            ? "#f97316"
                            : entry.traffic_status === "SEDANG"
                            ? "#eab308"
                            : "#22c55e"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Lancar
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Sedang
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Padat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Macet
              </span>
              <span className="flex items-center gap-1 font-semibold text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Pilihan ({selectedHour}:00)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
