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

  // Analisis prediksi untuk jam yang dipilih pengguna
  const hourStats = useMemo(() => {
    if (!hourlyInsights || !hourlyInsights.areas.length) return null;
    const areas = hourlyInsights.areas;
    const scores = areas.map((a) => a.hourly_scores[selectedHour] ?? 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const congestedInHour = areas.filter(
      (a) =>
        a.hourly_status[selectedHour] === "PADAT" ||
        a.hourly_status[selectedHour] === "MACET"
    );
    const smoothInHour = areas.filter(
      (a) => a.hourly_status[selectedHour] === "LANCAR"
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
      maxScore,
      cityStatus,
      congestedInHour,
      smoothInHour,
      isPeak,
      isMorningPeak,
      isEveningPeak,
    };
  }, [hourlyInsights, selectedHour]);

  const hourRecommendation = useMemo(() => {
    if (!hourStats) return "";
    const timeLabel = `${String(selectedHour).padStart(2, "0")}:00 WIB`;
    if (hourStats.cityStatus === "MACET") {
      const roadNames = hourStats.congestedInHour.map((a) => a.road_name).join(", ");
      return `Pukul ${timeLabel} merupakan periode kemacetan tinggi (skor rata-rata ${Math.round(hourStats.avgScore)}%). Ruas terdampak: ${roadNames || "Koridor Utama"}. Disarankan menunda keberangkatan atau menggunakan jalur alternatif.`;
    }
    if (hourStats.cityStatus === "PADAT") {
      return `Pukul ${timeLabel} arus kendaraan diprediksi padat merayap (skor ${Math.round(hourStats.avgScore)}%). Estimasi perjalanan bertambah 10–20 menit. Berangkat lebih awal sangat dianjurkan.`;
    }
    if (hourStats.cityStatus === "SEDANG") {
      return `Pukul ${timeLabel} lalu lintas cukup ramai namun kendaraan tetap mengalir normal (skor ${Math.round(hourStats.avgScore)}%). Waktu yang relatif aman untuk bepergian.`;
    }
    return `Pukul ${timeLabel} arus lalu lintas kota diprediksi sangat lancar (skor ${Math.round(hourStats.avgScore)}%). Waktu yang ideal untuk perjalanan bebas hambatan.`;
  }, [hourStats, selectedHour]);

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
                refreshHourly();
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

          {/* SECTION: Prediksi Lalu Lintas Berdasarkan Jam (Interactive Planner) */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock size={16} />
                  </span>
                  <h2 className="text-base font-bold text-zinc-900">
                    Prediksi Lalu Lintas Berdasarkan Jam
                  </h2>
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    Simulasi Waktu
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Pilih jam keberangkatan untuk melihat estimasi kepadatan di seluruh koridor kota Palembang.
                </p>
              </div>

              {/* Indikator Jam Terpilih */}
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-zinc-900 text-white px-3.5 py-1.5 flex items-center gap-2 shadow-xs">
                  <span className="text-xs text-zinc-400">Jam Dipilih:</span>
                  <span className="text-sm font-bold tracking-tight">
                    {String(selectedHour).padStart(2, "0")}:00 WIB
                  </span>
                  {selectedHour === new Date().getHours() && (
                    <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 font-bold">
                      Sekarang
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Slider & 24-Hour Timeline Bar Chart */}
            <div className="rounded-xl bg-zinc-50/80 border border-zinc-200/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>00:00 (Dini Hari)</span>
                <span className="font-bold text-zinc-900 bg-white px-2.5 py-0.5 rounded-md border border-zinc-200 shadow-2xs">
                  Pukul {String(selectedHour).padStart(2, "0")}:00 WIB
                </span>
                <span>23:00 (Malam)</span>
              </div>

              <input
                type="range"
                min={0}
                max={23}
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="w-full h-2.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              {/* 24-Hour Interactive Timeline Bar Chart */}
              <div className="pt-2">
                <div className="flex items-end gap-1 h-14 w-full">
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

                    let barColor = "bg-emerald-400 hover:bg-emerald-500";
                    if (hScore >= 75) barColor = "bg-rose-500 hover:bg-rose-600";
                    else if (hScore >= 50) barColor = "bg-amber-400 hover:bg-amber-500";
                    else if (hScore >= 25) barColor = "bg-yellow-400 hover:bg-yellow-500";

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHour(h)}
                        title={`Pukul ${String(h).padStart(2, "0")}:00 - Rata-rata Skor: ${Math.round(hScore)}%`}
                        className={`flex-1 flex flex-col items-center justify-end h-full transition-all group relative cursor-pointer ${
                          isSelected ? "scale-105" : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all ${barColor} ${
                            isSelected ? "ring-2 ring-indigo-600 ring-offset-1" : ""
                          }`}
                          style={{ height: `${Math.max(15, Math.min(100, hScore))}%` }}
                        />
                        <span
                          className={`text-[9px] mt-1 font-mono ${
                            isSelected ? "font-bold text-indigo-700" : "text-zinc-400"
                          }`}
                        >
                          {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                        </span>
                        {isCurrent && (
                          <span className="absolute -top-1 size-1.5 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 mt-2 gap-1.5">
                  <span>Klik salah satu batang jam di atas untuk beralih waktu</span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-emerald-400" /> Lancar
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-amber-400" /> Padat
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-rose-500" /> Macet
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200/60 flex-wrap">
                <span className="text-[11px] text-zinc-400 font-medium">Pintas Cepat:</span>
                {[
                  { label: "🌅 Pagi (07:00)", hour: 7 },
                  { label: "☀️ Siang (12:00)", hour: 12 },
                  { label: "🌆 Sore (17:00)", hour: 17 },
                  { label: "🌙 Malam (20:00)", hour: 20 },
                  {
                    label: `⏱️ Sekarang (${new Date().getHours()}:00)`,
                    hour: new Date().getHours(),
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedHour(preset.hour)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                      selectedHour === preset.hour
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hasil Prediksi Kota pada Jam Terpilih */}
            {hourStats && (
              <div className="rounded-xl border border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-600">Prediksi Umum Kota:</span>
                    <StatusBadge status={hourStats.cityStatus} />
                    {hourStats.isPeak && (
                      <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
                        {hourStats.isMorningPeak ? "Puncak Pagi" : "Puncak Sore"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Rata-rata Kepadatan:{" "}
                    <span className="font-bold text-zinc-800">
                      {Math.round(hourStats.avgScore)}%
                    </span>
                  </div>
                </div>

                {/* Rekomendasi Pintar */}
                <div className="rounded-lg bg-indigo-50/80 border border-indigo-100 p-3 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-950 leading-relaxed font-normal">
                    {hourRecommendation}
                  </p>
                </div>
              </div>
            )}

            {/* Grid 8 Ruas Jalan pada Jam Terpilih */}
            {hourlyInsights && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Kondisi 8 Ruas Koridor pada Pukul {String(selectedHour).padStart(2, "0")}:00 WIB
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {hourlyInsights.areas.map((area) => {
                    const status = area.hourly_status[selectedHour] || "LANCAR";
                    const score = area.hourly_scores[selectedHour] || 0;
                    const vpm = area.hourly_vpm[selectedHour] || 0;
                    const isAreaPeak =
                      (selectedHour >= 7 && selectedHour <= 8 && area.morning_peak) ||
                      (selectedHour >= 17 && selectedHour <= 18 && area.evening_peak);

                    return (
                      <div
                        key={area.camera_id}
                        className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                              CCTV #{area.camera_id}
                            </span>
                            <StatusBadge status={status} />
                          </div>
                          <h4 className="text-xs font-bold text-zinc-900 line-clamp-1">
                            {area.camera_name.replace(" (Palembang)", "")}
                          </h4>
                          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                            {area.road_name}
                          </p>

                          {/* Score bar */}
                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400">Skor: {Math.round(score)}%</span>
                              <span className="font-medium text-zinc-700">~{vpm} kend/mnt</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 75
                                    ? "bg-rose-500"
                                    : score >= 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                          {isAreaPeak ? (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Jam Sibuk
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">Normal</span>
                          )}
                          <Link
                            href={`/cctv/${area.camera_id}`}
                            className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
                          >
                            Detail <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
