"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  Search,
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
  CityHourlyInsightsResponse,
  Summary,
  TrafficCurrent,
  TrafficStatus,
} from "@/lib/types";
import { dateTime } from "@/lib/utils";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    return new Date().getHours();
  });

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

  const { data: hourlyInsights, mutate: refreshHourly } = useSWR<CityHourlyInsightsResponse>(
    "/api/traffic/hourly-insights",
    fetcher,
    { refreshInterval: 30_000 }
  );

  // Analisis proyeksi untuk jam yang dipilih pengguna
  const hourStats = useMemo(() => {
    if (!hourlyInsights || !hourlyInsights.areas.length) return null;
    const areas = hourlyInsights.areas;
    const scores = areas.map((a) => a.hourly_scores[selectedHour] ?? 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const congestedInHour = areas.filter(
      (a) =>
        a.hourly_status[selectedHour] === "PADAT" ||
        a.hourly_status[selectedHour] === "MACET"
    );

    let cityStatus: TrafficStatus = "LANCAR";
    if (avgScore >= 75 || congestedInHour.length >= 4) {
      cityStatus = "MACET";
    } else if (avgScore >= 50 || congestedInHour.length >= 2) {
      cityStatus = "PADAT";
    } else if (avgScore >= 25 || congestedInHour.length >= 1) {
      cityStatus = "SEDANG";
    }

    const isMorningPeak = selectedHour >= 7 && selectedHour <= 8;
    const isEveningPeak = selectedHour >= 16 && selectedHour <= 18;
    const isPeak = isMorningPeak || isEveningPeak;

    return {
      avgScore,
      cityStatus,
      congestedInHour,
      isPeak,
      isMorningPeak,
      isEveningPeak,
    };
  }, [hourlyInsights, selectedHour]);

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

  // Ruas padat saat ini
  const congestedRoads = useMemo(() => {
    if (!traffic || traffic.length === 0) return [];
    return traffic.filter(
      (t) => t.traffic_status === "PADAT" || t.traffic_status === "MACET"
    );
  }, [traffic]);

  // Persentase kelancaran kota
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
        eyebrow="Smart City Palembang · Arus Lalu Lintas Real-time"
        title="Pantauan Lalu Lintas Kota"
        description="Pemantauan kondisi koridor jalan, volume kendaraan 5 menit, dan siaran langsung CCTV kota Palembang."
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
                refreshHourly();
              }}
              title="Perbarui Data Terkini"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors cursor-pointer"
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
          {/* 4-KPI Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Status Koridor Kota */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium text-zinc-500">Kondisi Koridor Kota</span>
                <Compass size={16} className="text-zinc-400" />
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={
                      congestedRoads.length === 0
                        ? "LANCAR"
                        : congestedRoads.length >= 2
                        ? "MACET"
                        : "PADAT"
                    }
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-800 tabular">{smoothPercentage}%</span> koridor bebas hambatan
                </p>
              </div>
            </div>

            {/* KPI 2: Volume Kendaraan 5 Menit */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium text-zinc-500">Volume Kota (5 Menit)</span>
                <Clock size={16} className="text-zinc-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {summary.vehicles_last_5_minutes}
                  <span className="text-xs font-normal text-zinc-500 ml-1.5">kend</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Akumulasi terpantau di seluruh titik
                </p>
              </div>
            </div>

            {/* KPI 3: Kamera CCTV Online */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium text-zinc-500">Jaringan CCTV</span>
                <Video size={16} className="text-zinc-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {summary.cctv_online}
                  <span className="text-sm font-normal text-zinc-500 ml-1">/ {traffic.length}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Kamera aktif mendeteksi lalu lintas
                </p>
              </div>
            </div>

            {/* KPI 4: Titik Padat Terdeteksi */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium text-zinc-500">Titik Kepadatan</span>
                <AlertTriangle
                  size={16}
                  className={congestedRoads.length > 0 ? "text-amber-500" : "text-zinc-400"}
                />
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                  {congestedRoads.length}
                  <span className="text-xs font-normal text-zinc-500 ml-1.5">lokasi</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 truncate">
                  {congestedRoads.length > 0
                    ? congestedRoads.map((r) => r.road_name).join(", ")
                    : "Seluruh koridor terpantau lancar"}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION: Proyeksi Lalu Lintas 24 Jam */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Clock size={16} className="text-zinc-600" />
                  Proyeksi Lalu Lintas 24 Jam
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Estimasi profil kepadatan koridor kota Palembang sepanjang hari.
                </p>
              </div>

              {/* Preset Waktu */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "Pagi (07:00)", hour: 7 },
                  { label: "Siang (12:00)", hour: 12 },
                  { label: "Sore (17:00)", hour: 17 },
                  { label: "Malam (20:00)", hour: 20 },
                  {
                    label: `Sekarang (${new Date().getHours()}:00)`,
                    hour: new Date().getHours(),
                    isNow: true,
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedHour(preset.hour)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                      selectedHour === preset.hour
                        ? "bg-zinc-900 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                  >
                    {preset.isNow && (
                      <span className="inline-block size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    )}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 24-Hour Scrubber Bar Chart */}
            <div className="rounded-xl bg-zinc-50/70 border border-zinc-200/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-medium">Rentang Waktu 24 Jam</span>
                <span className="font-semibold text-zinc-800 bg-white px-2.5 py-0.5 rounded-md border border-zinc-200 text-xs shadow-2xs">
                  Pukul {String(selectedHour).padStart(2, "0")}:00 WIB
                </span>
              </div>

              {/* Bar Chart Container */}
              <div className="pt-2 pb-1">
                <div className="flex items-end gap-1.5 h-14 w-full">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hScore =
                      hourlyInsights && hourlyInsights.areas.length
                        ? hourlyInsights.areas.reduce(
                            (sum, a) => sum + (a.hourly_scores[h] ?? 0),
                            0
                          ) / hourlyInsights.areas.length
                        : 0;

                    const isSelected = selectedHour === h;
                    const isCurrent =
                      (hourlyInsights?.current_hour ?? new Date().getHours()) === h;

                    let barColor = "bg-emerald-400/80 hover:bg-emerald-500";
                    if (hScore >= 75) barColor = "bg-rose-500/90 hover:bg-rose-600";
                    else if (hScore >= 50) barColor = "bg-amber-400/90 hover:bg-amber-500";
                    else if (hScore >= 25) barColor = "bg-amber-300/80 hover:bg-amber-400";

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHour(h)}
                        title={`Pukul ${String(h).padStart(2, "0")}:00 - Estimasi: ${Math.round(hScore)}%`}
                        className={`flex-1 flex flex-col items-center justify-end h-full transition-all group relative cursor-pointer ${
                          isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-5 text-[10px] font-bold text-zinc-800 bg-white px-1 rounded shadow-2xs border border-zinc-200">
                            {Math.round(hScore)}%
                          </span>
                        )}
                        <div
                          className={`w-full rounded-xs transition-all ${barColor} ${
                            isSelected ? "ring-2 ring-zinc-900 ring-offset-1" : ""
                          }`}
                          style={{ height: `${Math.max(16, Math.min(100, hScore))}%` }}
                        />
                        <span
                          className={`text-[9px] mt-1 font-mono ${
                            isSelected ? "font-bold text-zinc-900" : "text-zinc-400"
                          }`}
                        >
                          {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                        </span>
                        {isCurrent && (
                          <span className="absolute -bottom-1 size-1 rounded-full bg-zinc-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend & Selected Hour Quick Telemetry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-zinc-200/50 gap-2">
                {hourStats ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-zinc-500">
                      Pukul <b className="text-zinc-800">{String(selectedHour).padStart(2, "0")}:00 WIB</b>:
                    </span>
                    <StatusBadge status={hourStats.cityStatus} />
                    <span className="text-zinc-500">
                      Kepadatan rata-rata:{" "}
                      <b className="text-zinc-800 tabular">{Math.round(hourStats.avgScore)}%</b>
                    </span>
                    {hourStats.isPeak && (
                      <span className="rounded bg-zinc-200/80 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                        {hourStats.isMorningPeak ? "Jam Sibuk Pagi" : "Jam Sibuk Sore"}
                      </span>
                    )}
                    {hourStats.congestedInHour.length > 0 && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-medium">
                        Padat: {hourStats.congestedInHour.map((a) => a.road_name).join(", ")}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-400 text-xs">Pilih jam untuk melihat proyeksi kepadatan</span>
                )}

                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-xs bg-emerald-400" /> Lancar
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-xs bg-amber-400" /> Padat
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-xs bg-rose-500" /> Macet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 8 CCTV Kota Palembang (Master Grid) */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Video size={16} className="text-zinc-600" />
                  Siaran Langsung CCTV Koridor Kota
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Pantau siaran video live dan volume akumulasi 5 menit pada 8 titik kamera jalan.
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
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Grid 8 Kartu CCTV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCctv.map((item) => (
                <div
                  key={item.camera_id}
                  className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Nomor + Status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                        CCTV #{item.camera_id}
                      </span>
                      <StatusBadge status={item.traffic_status} />
                    </div>

                    {/* Nama CCTV & Ruas Jalan */}
                    <h3 className="text-xs font-bold text-zinc-900 line-clamp-1">
                      {item.camera_name.replace(" (Palembang)", "")}
                    </h3>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-zinc-400 shrink-0" />
                      {item.road_name}
                    </p>

                    {/* Metrik Volume 5 Menit & Laju Arus */}
                    <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Volume (5 mnt):</span>
                        <span className="font-semibold text-zinc-900 tabular">
                          {item.rolling_5_minute ?? 0} kend
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Laju rata-rata:</span>
                        <span className="text-zinc-600 font-medium tabular">
                          ~{item.vehicles_per_minute ?? 0} kend./menit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Tonton Siaran Langsung */}
                  <Link
                    href={`/cctv/${item.camera_id}`}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-zinc-900 text-white py-2 text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors"
                  >
                    <Video size={13} />
                    <span>Lihat Siaran Langsung</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Grafik Volume & Komposisi Kendaraan */}
          <div className="pt-1">
            <TrafficCharts traffic={traffic} />
          </div>
        </>
      )}
    </div>
  );
}
