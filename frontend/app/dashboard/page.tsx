"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { TrafficCharts } from "@/components/traffic-charts";
import { TrafficHourlyInsights } from "@/components/traffic-hourly-insights";
import {
  ErrorState,
  LoadingCards,
  PageHeading,
  StatusBadge,
} from "@/components/ui";
import { fetcher } from "@/lib/api";
import type {
  Summary,
  TrafficCurrent,
} from "@/lib/types";
import { dateTime } from "@/lib/utils";

// Definisi 4 Worker dan 2 CCTV per worker (Pairing Berpasangan)
const WORKER_CONFIG = [
  {
    id: 1,
    name: "Worker AI #1",
    zone: "Koridor Sudirman - Burlian",
    cameraIds: [1, 2],
    description: "Mengawasi SP Charitas ⇄ Simpang Polda",
  },
  {
    id: 2,
    name: "Worker AI #2",
    zone: "Koridor Pusat Kota & Ampera",
    cameraIds: [3, 4],
    description: "Mengawasi Benteng Kuto Besak ⇄ Masjid Agung",
  },
  {
    id: 3,
    name: "Worker AI #3",
    zone: "Koridor Angkatan 45 & Taman Wisata",
    cameraIds: [5, 6],
    description: "Mengawasi Simpang Angkatan 45 ⇄ SP Samsat",
  },
  {
    id: 4,
    name: "Worker AI #4",
    zone: "Koridor Arteri Trans-Burlian",
    cameraIds: [7, 8],
    description: "Mengawasi KM 12 ⇄ Hutan Kota Punti Kayu",
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "hourly">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: summary, error: summaryError, mutate: refreshSummary } = useSWR<Summary>(
    "/api/traffic/summary",
    fetcher,
    { refreshInterval: 15_000 }
  );

  const { data: traffic, error: trafficError, mutate: refreshTraffic } = useSWR<TrafficCurrent[]>(
    "/api/traffic/current",
    fetcher,
    { refreshInterval: 10_000 }
  );

  // Map data traffic berdasarkan camera_id untuk lookup instan
  const trafficMap = useMemo(() => {
    const map = new Map<number, TrafficCurrent>();
    if (traffic) {
      for (const item of traffic) {
        map.set(item.camera_id, item);
      }
    }
    return map;
  }, [traffic]);

  // Filter 8 CCTV untuk Quick View Grid
  const filteredTraffic = useMemo(() => {
    if (!traffic) return [];
    return traffic.filter((item) => {
      const matchSearch =
        searchQuery === "" ||
        item.road_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.camera_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" || item.traffic_status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [traffic, searchQuery, statusFilter]);

  // Statistik kelancaran lalu lintas kota
  const smoothPercentage = useMemo(() => {
    if (!traffic || traffic.length === 0) return 100;
    const lancarCount = traffic.filter(
      (t) => t.traffic_status === "LANCAR" || t.traffic_status === "SEDANG"
    ).length;
    return Math.round((lancarCount / traffic.length) * 100);
  }, [traffic]);

  const totalVpm = useMemo(() => {
    if (!traffic) return 0;
    return Math.round(
      traffic.reduce((sum, item) => sum + (item.vehicles_per_minute || 0), 0)
    );
  }, [traffic]);

  return (
    <>
      <PageHeading
        eyebrow="Pusat Kendali Cerdas Kota Palembang"
        title="Dashboard Pemantauan Lalu Lintas"
        description="Monitoring terpadu 8 CCTV utama Kota Palembang secara bergantian dengan 4 worker AI computer vision. Data volume, kepadatan, dan deteksi terekam secara otomatis."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>
                4 Worker AI Aktif · {summary ? dateTime(summary.generated_at) : "Menghubungkan..."}
              </span>
            </div>

            <button
              onClick={() => {
                refreshSummary();
                refreshTraffic();
              }}
              title="Perbarui data sekarang"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
            >
              <RefreshCw size={13} className="text-zinc-500" />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {summaryError || trafficError ? (
        <ErrorState />
      ) : !summary || !traffic ? (
        <LoadingCards />
      ) : (
        <>
          {/* Quick Info Banner jika mode simulasi aktif */}
          {summary.demo_mode && (
            <div className="mb-6 rounded-xl border border-blue-200/80 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-blue-600 shrink-0" />
                <span>
                  <strong>Mode Pipeline Cerdas:</strong> 4 Worker AI aktif memantau 8 CCTV secara bergiliran (rotasi 60 detik). Data snapshot otomatis disimpan ke database setiap siklus.
                </span>
              </div>
              <span className="hidden sm:inline-block rounded-md border border-blue-300 bg-blue-100/70 px-2 py-0.5 text-[10px] font-semibold text-blue-900 uppercase">
                4 Worker Paralel
              </span>
            </div>
          )}

          {/* 4 KPI Utama Ringkas & Informatif */}
          <section className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {/* Card 1: 8 CCTV */}
            <article className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  CCTV Kota Terpantau
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Camera size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {summary.cctv_online} / 8
                </strong>
                <span className="text-xs font-semibold text-emerald-600">Online</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                100% Titik CCTV Palembang terhubung
              </p>
            </article>

            {/* Card 2: 4 Worker AI */}
            <article className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Worker AI Berjalan
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Cpu size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  4 Worker
                </strong>
                <span className="text-xs font-semibold text-indigo-600">Aktif</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                1 Worker = 2 CCTV bergantian (60s)
              </p>
            </article>

            {/* Card 3: Arus Lalu Lintas */}
            <article className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Laju Arus Kendaraan
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <Activity size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {totalVpm}
                </strong>
                <span className="text-xs font-medium text-zinc-500">kend/menit</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {summary.vehicles_last_5_minutes.toLocaleString("id-ID")} kend. dalam 5 menit
              </p>
            </article>

            {/* Card 4: Indeks Kelancaran */}
            <article className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Tingkat Kelancaran Kota
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <TrendingUp size={16} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {smoothPercentage}%
                </strong>
                <span className="text-xs font-semibold text-emerald-600">
                  {summary.congested_roads === 0 ? "Normal" : `${summary.congested_roads} Titik Padat`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {summary.congested_roads === 0 ? "Semua jalur terpantau lancar" : "Memerlukan perhatian petugas"}
              </p>
            </article>
          </section>

          {/* Panel Khusus: Pengawasan 4 Worker Multi-Kamera */}
          <section className="mt-6 rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/70 to-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/70">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Cpu size={15} />
                  </div>
                  <h2 className="text-base font-bold text-zinc-900">
                    Status 4 Worker Multi-Kamera (1 Worker = 2 CCTV)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Setiap worker membagi beban pemrosesan YOLO + ByteTrack dengan bergantian memantau 2 kamera setiap 60 detik.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Siklus 60s Otonom
                </span>
              </div>
            </div>

            {/* Grid 4 Worker Cards */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WORKER_CONFIG.map((worker) => {
                const cam1 = trafficMap.get(worker.cameraIds[0]);
                const cam2 = trafficMap.get(worker.cameraIds[1]);

                return (
                  <div
                    key={worker.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div>
                      {/* Header Worker */}
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          {worker.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={12} /> Aktif
                        </span>
                      </div>

                      <h3 className="mt-2 text-xs font-semibold text-zinc-700">
                        {worker.zone}
                      </h3>

                      {/* 2 CCTV yang diawasi */}
                      <div className="mt-3 space-y-2">
                        {/* Kamera A */}
                        <div className="rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-zinc-800 truncate">
                              #{worker.cameraIds[0]} {cam1?.camera_name || `CCTV #${worker.cameraIds[0]}`}
                            </span>
                            {cam1 && <StatusBadge status={cam1.traffic_status} />}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                            <span className="truncate">{cam1?.road_name || "Palembang"}</span>
                            <span className="font-medium text-zinc-700 shrink-0">
                              {cam1?.vehicles_per_minute || 0} kend/m
                            </span>
                          </div>
                        </div>

                        {/* Indikator Pergantian */}
                        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-zinc-400 py-0.5">
                          <span>⇅</span> Bergantian tiap 60 detik
                        </div>

                        {/* Kamera B */}
                        <div className="rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-zinc-800 truncate">
                              #{worker.cameraIds[1]} {cam2?.camera_name || `CCTV #${worker.cameraIds[1]}`}
                            </span>
                            {cam2 && <StatusBadge status={cam2.traffic_status} />}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                            <span className="truncate">{cam2?.road_name || "Palembang"}</span>
                            <span className="font-medium text-zinc-700 shrink-0">
                              {cam2?.vehicles_per_minute || 0} kend/m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Data snapshot DB</span>
                      <span className="font-semibold text-emerald-600">Auto-Save</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick CCTV Live Grid: 8 Kamera Terpantau */}
          <section className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Video size={18} className="text-zinc-700" />
                  Kondisi 8 Titik CCTV Palembang Terkini
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Klik pada kamera mana saja untuk melihat video streaming dan analisis visual real-time.
                </p>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari CCTV / jalan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 sm:w-56 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 text-xs shadow-2xs">
                  {["ALL", "LANCAR", "PADAT", "MACET"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        statusFilter === st
                          ? "bg-zinc-900 text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {st === "ALL" ? "Semua (8)" : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid 8 Cards CCTV */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {filteredTraffic.map((item) => {
                const assignedWorker = WORKER_CONFIG.find((w) =>
                  w.cameraIds.includes(item.camera_id)
                );

                const totalClassVehicles =
                  (item.motorcycle_count || 0) +
                  (item.car_count || 0) +
                  (item.bus_count || 0) +
                  (item.truck_count || 0);

                const motorPct = totalClassVehicles > 0 ? Math.round((item.motorcycle_count / totalClassVehicles) * 100) : 50;
                const carPct = 100 - motorPct;

                return (
                  <Link
                    key={item.camera_id}
                    href={`/cctv/${item.camera_id}`}
                    className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs transition-all hover:border-zinc-400 hover:shadow-md"
                  >
                    <div>
                      {/* Top Bar: Nomor Kamera + Worker Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
                          CCTV #{item.camera_id}
                        </span>
                        <StatusBadge status={item.traffic_status} />
                      </div>

                      {/* Nama CCTV & Jalan */}
                      <h3 className="mt-2.5 text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {item.camera_name}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1 flex items-center gap-1">
                        <MapPin size={11} className="text-zinc-400 shrink-0" />
                        {item.road_name}
                      </p>

                      {/* Metrik Volume Kendaraan */}
                      <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 border border-zinc-100">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-zinc-500">Arus Lalu Lintas</span>
                          <span className="text-sm font-bold text-zinc-900 tabular">
                            {item.vehicles_per_minute}{" "}
                            <span className="text-[10px] font-normal text-zinc-500">kend/menit</span>
                          </span>
                        </div>

                        {/* Bar Komposisi Kendaraan Mini */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                            <span>Motor: {item.motorcycle_count}</span>
                            <span>Mobil/Lain: {(item.car_count || 0) + (item.bus_count || 0) + (item.truck_count || 0)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden flex">
                            <div
                              style={{ width: `${motorPct}%` }}
                              className="bg-sky-500 h-full"
                              title={`Motor: ${motorPct}%`}
                            />
                            <div
                              style={{ width: `${carPct}%` }}
                              className="bg-indigo-500 h-full"
                              title={`Mobil: ${carPct}%`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Worker Assignment & Action Link */}
                    <div className="mt-3.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                      <span className="rounded bg-indigo-50/80 px-1.5 py-0.5 font-medium text-indigo-700">
                        {assignedWorker ? assignedWorker.name : "Worker AI"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 group-hover:text-indigo-600 transition-colors">
                        Buka CCTV <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Tab Navigation: Analisis & Grafik Mendalam */}
          <section className="mt-10">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === "overview"
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <BarChart3 size={15} />
                  <span>Grafik & Distribusi Kendaraan</span>
                </button>

                <button
                  onClick={() => setActiveTab("hourly")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === "hourly"
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <Clock size={15} />
                  <span>Pola Jam Sibuk & Prediksi Kota</span>
                </button>
              </div>

              <span className="hidden sm:inline-block text-xs text-zinc-400">
                Pembaruan otomatis setiap 15 detik
              </span>
            </div>

            {/* Tab Content 1: Overview Chart & Ruas Terpantau */}
            {activeTab === "overview" && (
              <div className="mt-5 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
                <TrafficCharts traffic={traffic} />

                {/* Ringkasan Ruas Jalan */}
                <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900">
                          Ringkasan Status 8 Ruas Jalan
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Tingkat kepadatan per koridor kota
                        </p>
                      </div>
                      <Activity size={18} className="text-zinc-400" />
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {traffic.map((item) => (
                        <div
                          key={item.camera_id}
                          className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <strong className="block text-xs font-semibold text-zinc-900 truncate">
                              {item.road_name}
                            </strong>
                            <span className="text-[11px] text-zinc-400 truncate block">
                              {item.camera_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-bold text-zinc-900 tabular">
                                {item.vehicles_per_minute}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">kend/m</span>
                            </div>
                            <StatusBadge status={item.traffic_status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 text-center">
                    <Link
                      href="/map"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <MapPin size={13} />
                      Buka Peta Interaktif Seluruh Kota
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content 2: Hourly Insights & Matrix */}
            {activeTab === "hourly" && (
              <div className="mt-5">
                <TrafficHourlyInsights />
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
