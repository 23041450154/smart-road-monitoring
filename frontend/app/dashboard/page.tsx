"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Search,
  Video,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { TrafficCharts } from "@/components/traffic-charts";
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

export default function Dashboard() {
  const [search, setSearch] = useState("");

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

  // Filter 8 CCTV pencarian sederhana
  const filteredCctv = useMemo(() => {
    if (!traffic) return [];
    if (!search.trim()) return traffic;
    const q = search.toLowerCase();
    return traffic.filter(
      (c) =>
        c.camera_name.toLowerCase().includes(q) ||
        c.road_name.toLowerCase().includes(q)
    );
  }, [traffic, search]);

  // Hitung jumlah jalan padat/macet
  const congestedCount = useMemo(() => {
    if (!traffic) return 0;
    return traffic.filter(
      (t) => t.traffic_status === "PADAT" || t.traffic_status === "MACET"
    ).length;
  }, [traffic]);

  // Rata-rata kendaraan per menit
  const avgVehicles = useMemo(() => {
    if (!traffic || traffic.length === 0) return 0;
    const total = traffic.reduce((acc, curr) => acc + (curr.vehicles_per_minute || 0), 0);
    return Math.round(total / traffic.length);
  }, [traffic]);

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <PageHeading
        eyebrow="Kota Palembang"
        title="Pantauan Lalu Lintas Terkini"
        description="Informasi langsung kondisi jalan dan CCTV di 8 titik utama Kota Palembang."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live · {summary ? dateTime(summary.generated_at) : "Menghubungkan"}
            </span>

            <button
              onClick={() => {
                refreshSummary();
                refreshTraffic();
              }}
              title="Perbarui Data"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
            >
              <RefreshCw size={13} />
              <span>Segarkan</span>
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
          {/* Banner Status Kondisi Kota (Ramah Pengguna) */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              congestedCount === 0
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-amber-50/80 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                  congestedCount === 0
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {congestedCount === 0 ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold">
                  {congestedCount === 0
                    ? "Arus Lalu Lintas Palembang Terpantau Lancar"
                    : `Ada ${congestedCount} Titik Jalan Padat / Macet`}
                </h2>
                <p className="text-xs opacity-90 mt-0.5">
                  {congestedCount === 0
                    ? "Semua 8 titik kamera CCTV menunjukkan arus lalu lintas normal dan terkendali."
                    : "Perhatikan rute alternatif pada titik yang mengalami peningkatan volume kendaraan."}
                </p>
              </div>
            </div>

            {/* Tombol Aksi Cepat */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors"
              >
                <MapPin size={14} />
                <span>Lihat di Peta</span>
              </Link>

              <Link
                href="/cctv"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-800 px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-zinc-50 transition-colors"
              >
                <Video size={14} />
                <span>Semua CCTV</span>
              </Link>
            </div>
          </div>

          {/* 3 Ringkasan Angka Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1 */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Kamera CCTV Aktif</span>
                <Camera size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-900">
                8 / 8 <span className="text-xs font-medium text-emerald-600">Online</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Seluruh kamera kota terhubung aktif
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Rata-rata Arus Kendaraan</span>
                <Activity size={16} className="text-sky-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-900">
                {avgVehicles} <span className="text-xs font-medium text-zinc-500">kend/menit</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Rata-rata volume dari seluruh titik jalan
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Kondisi Jalan</span>
                <CheckCircle2 size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-900">
                {congestedCount === 0 ? "Lancar" : `${congestedCount} Padat`}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {congestedCount === 0 ? "Tidak ada kemacetan berarti" : "Perlu perhatian di jalur padat"}
              </p>
            </div>
          </div>

          {/* Bagian 8 Titik CCTV Palembang (Sederhana & Mudah Diakses) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Video size={17} className="text-zinc-600" />
                  Kondisi 8 Titik CCTV Palembang
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Pilih salah satu CCTV untuk melihat siaran video langsung.
                </p>
              </div>

              {/* Pencarian Cepat */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari nama jalan / CCTV..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Grid 8 Kartu CCTV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredCctv.map((item) => (
                <div
                  key={item.camera_id}
                  className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Kartu: Nomor + Status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                        CCTV #{item.camera_id}
                      </span>
                      <StatusBadge status={item.traffic_status} />
                    </div>

                    {/* Nama CCTV & Jalan */}
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-1">
                      {item.camera_name.replace(" (Palembang)", "")}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-zinc-400 shrink-0" />
                      {item.road_name}
                    </p>

                    {/* Info Volume */}
                    <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Kepadatan:</span>
                      <span className="font-bold text-zinc-900">
                        {item.vehicles_per_minute}{" "}
                        <span className="text-[10px] font-normal text-zinc-500">kend/menit</span>
                      </span>
                    </div>
                  </div>

                  {/* Tombol Buka Streaming */}
                  <Link
                    href={`/cctv/${item.camera_id}`}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-zinc-900 text-white py-2 text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors"
                  >
                    <span>Tonton Siaran Langsung</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Grafik Volume Lalu Lintas Sederhana */}
          <div className="pt-2">
            <TrafficCharts traffic={traffic} />
          </div>
        </>
      )}
    </div>
  );
}
