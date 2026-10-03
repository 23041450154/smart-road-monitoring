"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Video,
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

  // Filter pencarian CCTV
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

  // Insight 1: Jalan paling lancar & lengang
  const smoothestRoads = useMemo(() => {
    if (!traffic || traffic.length === 0) return [];
    return [...traffic]
      .filter((t) => t.traffic_status === "LANCAR")
      .sort((a, b) => a.vehicles_per_minute - b.vehicles_per_minute)
      .slice(0, 2);
  }, [traffic]);

  // Insight 2: Titik yang sedang padat/macet
  const congestedRoads = useMemo(() => {
    if (!traffic || traffic.length === 0) return [];
    return traffic.filter(
      (t) => t.traffic_status === "PADAT" || t.traffic_status === "MACET"
    );
  }, [traffic]);

  // Insight 3: Persentase kelancaran kota
  const smoothPercentage = useMemo(() => {
    if (!traffic || traffic.length === 0) return 100;
    const smoothCount = traffic.filter(
      (t) => t.traffic_status === "LANCAR" || t.traffic_status === "SEDANG"
    ).length;
    return Math.round((smoothCount / traffic.length) * 100);
  }, [traffic]);

  return (
    <div className="space-y-6">
      {/* Header Utama Pengguna */}
      <PageHeading
        eyebrow="Portal Informasi Warga & Pengendara"
        title="Pantauan Lalu Lintas Kota Palembang"
        description="Ketahui kondisi jalan sebelum bepergian. Pantau 8 titik CCTV kota secara langsung dan cek rute terbaik hari ini."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live · {summary ? dateTime(summary.generated_at) : "Menghubungkan"}
            </span>

            <button
              onClick={() => {
                refreshSummary();
                refreshTraffic();
              }}
              title="Perbarui Data Terkini"
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
          {/* Banner Status Ringkas Pengendara */}
          <div
            className={`rounded-2xl p-5 border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              congestedRoads.length === 0
                ? "bg-emerald-50/90 border-emerald-200/90 text-emerald-950"
                : "bg-amber-50/90 border-amber-200/90 text-amber-950"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`flex size-11 items-center justify-center rounded-xl shrink-0 shadow-xs ${
                  congestedRoads.length === 0
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {congestedRoads.length === 0 ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <AlertTriangle size={24} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold">
                    {congestedRoads.length === 0
                      ? "Lalu Lintas Palembang Umumnya Lancar"
                      : `Perhatian: ${congestedRoads.length} Titik Mengalami Kepadatan`}
                  </h2>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold">
                    {smoothPercentage}% Lancar
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  {congestedRoads.length === 0
                    ? "Kondisi arus kendaraan di 8 koridor utama kota berjalan normal dan nyaman untuk dilalui."
                    : `Jalur padat terdeteksi di ${congestedRoads.map((r) => r.road_name).join(", ")}. Pertimbangkan waktu atau rute alternatif.`}
                </p>
              </div>
            </div>

            {/* Tombol Akses Cepat */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-4 py-2 text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors"
              >
                <Compass size={14} />
                <span>Buka Peta Jalan</span>
              </Link>

              <Link
                href="/potholes"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-800 px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-zinc-50 transition-colors"
              >
                <ShieldAlert size={14} className="text-amber-600" />
                <span>Info Lubang Jalan</span>
              </Link>
            </div>
          </div>

          {/* 3 Kartu Insight Praktis untuk Pengendara */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insight 1: Rekomendasi Jalur Lengang */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 mb-2.5">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                    <TrendingDown size={13} />
                    Rekomendasi Jalur Nyaman
                  </span>
                  <Sparkles size={15} className="text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mt-1">
                  {smoothestRoads.length > 0
                    ? smoothestRoads[0].road_name
                    : "Jalur Utama Palembang"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {smoothestRoads.length > 0
                    ? `Arus sangat lengang (~${smoothestRoads[0].vehicles_per_minute} kendaraan/menit). Nyaman untuk dilalui sekarang.`
                    : "Semua jalur terpantau stabil."}
                </p>
              </div>

              {smoothestRoads.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Titik Kamera:</span>
                  <Link
                    href={`/cctv/${smoothestRoads[0].camera_id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                  >
                    Lihat CCTV #{smoothestRoads[0].camera_id} <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>

            {/* Insight 2: Titik Rawan Kepadatan */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 mb-2.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    congestedRoads.length > 0
                      ? "text-amber-700 bg-amber-50 border-amber-100"
                      : "text-zinc-600 bg-zinc-50 border-zinc-100"
                  }`}>
                    {congestedRoads.length > 0 ? (
                      <>
                        <TrendingUp size={13} className="text-amber-600" />
                        Jalur Mengalami Peningkatan
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Seluruh Jalur Bebas Hambatan
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mt-1">
                  {congestedRoads.length > 0
                    ? congestedRoads[0].road_name
                    : "Tidak Ada Kemacetan"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {congestedRoads.length > 0
                    ? `Terpantau ${congestedRoads[0].vehicles_per_minute} kend/menit (${congestedRoads[0].traffic_status}). Disarankan berangkat lebih awal.`
                    : "Tidak ditemukan titik jalan macet pada 8 koridor CCTV utama kota."}
                </p>
              </div>

              {congestedRoads.length > 0 ? (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Pantau Langsung:</span>
                  <Link
                    href={`/cctv/${congestedRoads[0].camera_id}`}
                    className="font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
                  >
                    Buka Kamera #{congestedRoads[0].camera_id} <ArrowRight size={11} />
                  </Link>
                </div>
              ) : (
                <div className="mt-3 pt-2.5 border-t border-zinc-100 text-xs text-zinc-400">
                  Kondisi lalu lintas kota sangat bersahabat.
                </div>
              )}
            </div>

            {/* Insight 3: Peringatan Keselamatan Jalan */}
            <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-500 mb-2.5">
                  <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 flex items-center gap-1">
                    <ShieldAlert size={13} />
                    Kondisi Fisik Jalan
                  </span>
                  <Clock size={15} className="text-zinc-400" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mt-1">
                  {summary.detected_potholes > 0
                    ? `${summary.detected_potholes} Titik Lubang Terdeteksi`
                    : "Kondisi Jalan Baik"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {summary.detected_potholes > 0
                    ? "Pengendara motor disarankan berhati-hati saat melintasi jalur berlubang, terutama di malam hari atau saat hujan."
                    : "Tidak ada kerusakan jalan signifikan yang tercatat."}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Detail Lokasi:</span>
                <Link
                  href="/potholes"
                  className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  Peta Lubang Jalan <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          {/* 8 CCTV Kota Palembang (Pilihan Utama Pengguna) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Video size={18} className="text-zinc-700" />
                  Siaran Langsung 8 CCTV Kota Palembang
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Klik pada kamera untuk melihat siaran video langsung kondisi jalan saat ini.
                </p>
              </div>

              {/* Pencarian Cepat Ruas Jalan */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari CCTV / nama jalan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Grid 8 Kartu CCTV Ramah Pengguna */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCctv.map((item) => (
                <div
                  key={item.camera_id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Nomor + Status */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                        CCTV #{item.camera_id}
                      </span>
                      <StatusBadge status={item.traffic_status} />
                    </div>

                    {/* Nama CCTV & Ruas Jalan */}
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-1">
                      {item.camera_name.replace(" (Palembang)", "")}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-zinc-400 shrink-0" />
                      {item.road_name}
                    </p>

                    {/* Keterangan Kepadatan */}
                    <div className="mt-3.5 rounded-xl bg-zinc-50/80 p-2.5 border border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Arus Lalu Lintas:</span>
                      <span className="font-bold text-zinc-900">
                        {item.vehicles_per_minute}{" "}
                        <span className="text-[10px] font-normal text-zinc-500">kend/menit</span>
                      </span>
                    </div>
                  </div>

                  {/* Tombol Tonton Siaran Langsung */}
                  <Link
                    href={`/cctv/${item.camera_id}`}
                    className="mt-4 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-zinc-900 text-white py-2.5 text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors"
                  >
                    <Video size={14} />
                    <span>Lihat Siaran Langsung</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Grafik Perbandingan Arus Ruas Jalan */}
          <div className="pt-2">
            <TrafficCharts traffic={traffic} />
          </div>
        </>
      )}
    </div>
  );
}
