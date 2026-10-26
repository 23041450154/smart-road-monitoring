"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MessageSquare,
  RefreshCw,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { TrafficCharts } from "@/components/traffic-charts";
import {
  ErrorState,
  LoadingCards,
  StatusBadge,
} from "@/components/ui";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  CityHourlyInsightsResponse,
  Summary,
  TrafficCurrent,
  TrafficStatus,
} from "@/lib/types";
import { cn, dateTime } from "@/lib/utils";

export default function Dashboard() {
  const { role } = useAuth();
  const [selectedHour, setSelectedHour] = useState<number>(() => new Date().getHours());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshSummary(), refreshTraffic(), refreshHourly()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }

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

  // Ruas padat saat ini
  const congestedRoads = useMemo(() => {
    if (!traffic || traffic.length === 0) return [];
    return traffic.filter(
      (t) => t.traffic_status === "PADAT" || t.traffic_status === "MACET"
    );
  }, [traffic]);

  // Status kelancaran kota
  const smoothPercentage = useMemo(() => {
    if (!traffic || traffic.length === 0) return 100;
    const smoothCount = traffic.filter(
      (t) => t.traffic_status === "LANCAR" || t.traffic_status === "SEDANG"
    ).length;
    return Math.round((smoothCount / traffic.length) * 100);
  }, [traffic]);

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-5">
      {/* 21st.dev Minimalist Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1">
            <span>Palembang Smart Mobility</span>
            <span>/</span>
            <span className="font-medium text-zinc-700">Dashboard</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Pusat Kendali Lalu Lintas Kota
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Telemetri status koridor jalan, volume arus 5 menit, dan proyeksi mobilitas kota.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-zinc-600">
              {summary ? dateTime(summary.generated_at) : "Menghubungkan"}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {summaryError || trafficError ? (
        <ErrorState />
      ) : !summary || !traffic ? (
        <LoadingCards />
      ) : (
        <>
          {/* Guest Role Banner: Clean Emerald Light Theme */}
          {role === "guest" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white px-4 py-3 text-slate-800 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <MessageSquare size={14} />
                </span>
                <p className="text-xs text-slate-600">
                  <strong className="font-semibold text-slate-900">Bot WhatsApp:</strong> Dapatkan notifikasi kondisi kemacetan & rute 5 menit sebelum jam berangkat perjalanan Anda.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
              >
                <span>Hubungkan WA</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}

          {/* 4-KPI Metric Bento (Minimalist 21st.dev Style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Status Koridor Kota */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Status Koridor
                </span>
                <Compass size={14} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge
                  status={
                    congestedRoads.length === 0
                      ? "LANCAR"
                      : congestedRoads.length >= 2
                      ? "MACET"
                      : "PADAT"
                  }
                />
                <span className="font-mono text-xs text-zinc-500">
                  {smoothPercentage}% lancar
                </span>
              </div>
              <p className="mt-2.5 text-[11px] text-zinc-400 truncate">
                {congestedRoads.length === 0 ? "Seluruh ruas bebas hambatan" : `${congestedRoads.length} ruas padat`}
              </p>
            </div>

            {/* KPI 2: Volume Kendaraan 5 Menit */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Volume (5 Mnt)
                </span>
                <Activity size={14} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 tabular">
                  {summary.vehicles_last_5_minutes}
                </span>
                <span className="text-xs text-zinc-400">kend</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 truncate">
                Laju rerata ~{Math.round(summary.vehicles_last_5_minutes / 5)} kend./mnt
              </p>
            </div>

            {/* KPI 3: Kamera CCTV Online */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Kamera CCTV
                </span>
                <Video size={14} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 tabular">
                  {summary.cctv_online}
                </span>
                <span className="font-mono text-xs text-zinc-400">/ {traffic.length} Online</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">100% aktif</span>
                <Link href="/cctv" className="font-medium text-zinc-900 hover:underline">
                  Buka CCTV &rarr;
                </Link>
              </div>
            </div>

            {/* KPI 4: Titik Padat Terdeteksi */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-medium tracking-wider uppercase">
                  Titik Kepadatan
                </span>
                <AlertTriangle size={14} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 tabular">
                  {congestedRoads.length}
                </span>
                <span className="text-xs text-zinc-400">titik padat</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 truncate">
                {congestedRoads.length > 0
                  ? congestedRoads.map((r) => r.road_name).join(", ")
                  : "Arus koridor normal lancar"}
              </p>
            </div>
          </div>

          {/* SECTION: Insight Akses & Komunitas Pengguna (Admin Only) */}
          {role === "admin" && (
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                    Insight Akses & Partisipasi Warga
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Statistik pengguna terdaftar yang memantau arus jalan & mengaktifkan peringatan rute real-time.
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Layanan Aktif
                  </span>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition"
                  >
                    <span>Panel Admin</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:divide-x sm:divide-zinc-100">
                <div className="sm:pr-4">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Total Pengguna Akses
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 tabular">
                      {summary.total_users ?? 0}
                    </span>
                    <span className="text-xs text-zinc-400">warga terdaftar</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Memantau mobilitas kota
                  </p>
                </div>

                <div className="sm:px-4">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Akun Terverifikasi
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold tracking-tight text-emerald-600 tabular">
                      {summary.active_users ?? summary.total_users ?? 0}
                    </span>
                    <span className="text-xs text-zinc-400">tervalidasi</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 size={11} />
                    Email & OTP aktif
                  </p>
                </div>

                <div className="sm:px-4">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Rute Terpantau
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold tracking-tight text-blue-600 tabular">
                      {summary.total_routes ?? 0}
                    </span>
                    <span className="text-xs text-zinc-400">rute terjadwal</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Monitoring kemacetan rute
                  </p>
                </div>

                <div className="sm:pl-4">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Frekuensi Telemetri
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 tabular">
                      Real-time
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Sinkronisasi tiap 10–15 dtk
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Proyeksi Lalu Lintas 24 Jam (21st.dev Clean Bento Card) */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                  <Clock size={15} className="text-zinc-500" />
                  Proyeksi Kepadatan Lalu Lintas 24 Jam
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Estimasi indeks kepadatan koridor kota Palembang sepanjang hari.
                </p>
              </div>

              {/* Segmented Tab Pill Selector */}
              <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs text-zinc-600 gap-0.5">
                {[
                  { label: "Pagi (07:00)", hour: 7 },
                  { label: "Siang (12:00)", hour: 12 },
                  { label: "Sore (17:00)", hour: 17 },
                  { label: "Malam (20:00)", hour: 20 },
                  {
                    label: `Sekarang (${currentHour}:00)`,
                    hour: currentHour,
                    isNow: true,
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedHour(preset.hour)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                      selectedHour === preset.hour
                        ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    )}
                  >
                    {preset.isNow && (
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    )}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 24-Hour Scrubber Bar Chart */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-medium text-[11px] uppercase tracking-wider text-zinc-400">
                  Profil 24 Jam (Klik untuk Memilih Jam)
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-800">
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
                      (hourlyInsights?.current_hour ?? currentHour) === h;

                    let barColor = "bg-zinc-200 hover:bg-zinc-300";
                    if (hScore >= 75) barColor = "bg-rose-400/80 hover:bg-rose-500";
                    else if (hScore >= 50) barColor = "bg-amber-400/80 hover:bg-amber-500";
                    else if (hScore >= 25) barColor = "bg-zinc-300 hover:bg-zinc-400";

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHour(h)}
                        title={`Pukul ${String(h).padStart(2, "0")}:00 - Estimasi: ${Math.round(hScore)}%`}
                        className={cn(
                          "flex-1 flex flex-col items-center justify-end h-full transition-all group relative cursor-pointer",
                          isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute -top-5 text-[10px] font-mono font-bold text-zinc-900 bg-white px-1.5 rounded shadow-2xs border border-zinc-200">
                            {Math.round(hScore)}%
                          </span>
                        )}
                        <div
                          className={cn(
                            "w-full rounded-xs transition-all",
                            isSelected ? "bg-blue-600 ring-2 ring-blue-600/30" : barColor
                          )}
                          style={{ height: `${Math.max(14, Math.min(100, hScore))}%` }}
                        />
                        <span
                          className={cn(
                            "text-[9px] mt-1 font-mono",
                            isSelected ? "font-bold text-blue-600" : "text-zinc-400"
                          )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2.5 border-t border-zinc-200/60 gap-2">
                {hourStats ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-500">
                      Pukul <b className="text-zinc-900 font-mono">{String(selectedHour).padStart(2, "0")}:00 WIB</b>:
                    </span>
                    <StatusBadge status={hourStats.cityStatus} />
                    <span className="text-zinc-500 font-mono text-xs">
                      Indeks: <b className="text-zinc-900">{Math.round(hourStats.avgScore)}%</b>
                    </span>
                    {hourStats.isPeak && (
                      <span className="text-[11px] font-semibold text-zinc-700">
                        · {hourStats.isMorningPeak ? "Jam Sibuk Pagi" : "Jam Sibuk Sore"}
                      </span>
                    )}
                    {hourStats.congestedInHour.length > 0 && (
                      <span className="text-[11px] text-amber-700 font-medium">
                        · Padat: {hourStats.congestedInHour.map((a) => a.road_name).join(", ")}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-400 text-xs">Pilih jam untuk melihat proyeksi kepadatan</span>
                )}

                <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-zinc-300" /> Lancar
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-400" /> Padat
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-rose-500" /> Macet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grafik Volume & Komposisi Kendaraan */}
          <div className="pt-0.5">
            <TrafficCharts traffic={traffic} />
          </div>
        </>
      )}
    </div>
  );
}
