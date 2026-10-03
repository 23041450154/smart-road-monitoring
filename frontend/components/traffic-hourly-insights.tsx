"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Moon,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { CityHourlyInsightsResponse, TrafficStatus } from "@/lib/types";
import { StatusBadge } from "./ui";

const STATUS_COLOR_MAP: Record<TrafficStatus, { bg: string; text: string; cell: string; border: string }> = {
  LANCAR: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    cell: "bg-emerald-500 hover:bg-emerald-600",
    border: "border-emerald-200",
  },
  SEDANG: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    cell: "bg-amber-400 hover:bg-amber-500",
    border: "border-amber-200",
  },
  PADAT: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    cell: "bg-orange-500 hover:bg-orange-600",
    border: "border-orange-200",
  },
  MACET: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    cell: "bg-rose-600 hover:bg-rose-700",
    border: "border-rose-200",
  },
};

export function TrafficHourlyInsights() {
  const { data, error, isLoading } = useSWR<CityHourlyInsightsResponse>(
    "/api/traffic/hourly-insights",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const [userSelectedHour, setUserSelectedHour] = useState<number | null>(null);
  const selectedHour = userSelectedHour ?? data?.current_hour ?? new Date().getHours();
  const setSelectedHour = (h: number) => setUserSelectedHour(h);

  const currentHourOnServer = data?.current_hour ?? new Date().getHours();

  // Stats for the selected hour
  const areas = data?.areas;
  const hourStats = useMemo(() => {
    if (!areas) return { congested: 0, moderate: 0, smooth: 0, total: 0 };
    let congested = 0;
    let moderate = 0;
    let smooth = 0;
    for (const area of areas) {
      const st = area.hourly_status[selectedHour];
      if (st === "MACET" || st === "PADAT") congested++;
      else if (st === "SEDANG") moderate++;
      else smooth++;
    }
    return { congested, moderate, smooth, total: areas.length };
  }, [areas, selectedHour]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 text-sm text-rose-800">
        <p className="font-semibold">Gagal memuat wawasan jam lalu lintas</p>
        <p className="text-xs text-rose-600 mt-1">Pastikan backend API dapat diakses.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-zinc-200 rounded" />
        <div className="h-4 w-1/2 bg-zinc-100 rounded" />
        <div className="h-32 bg-zinc-100 rounded-lg" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Main Container */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 p-5 sm:px-6 bg-gradient-to-r from-zinc-50/70 to-white">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 mb-1.5 border border-blue-200/60">
              <Clock size={12} />
              <span>Wawasan Pola Arus 24 Jam</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Wawasan & Analisis Jam Padat per Area
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ketahui jam berapa saja tiap ruas jalan di Palembang berstatus padat atau lancar berdasarkan akumulasi sensor AI dan pola mobilitas harian.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
            <span className="text-[11px] text-zinc-400 mr-1 hidden sm:inline">Pintas:</span>
            <button
              onClick={() => setSelectedHour(currentHourOnServer)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                selectedHour === currentHourOnServer
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Jam Sekarang ({currentHourOnServer.toString().padStart(2, "0")}:00)</span>
            </button>
            <button
              onClick={() => setSelectedHour(7)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                selectedHour === 7
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/60"
              }`}
            >
              <Sun size={12} />
              <span>Pagi (07:00)</span>
            </button>
            <button
              onClick={() => setSelectedHour(12)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                selectedHour === 12
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <Sun size={12} />
              <span>Siang (12:00)</span>
            </button>
            <button
              onClick={() => setSelectedHour(17)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                selectedHour === 17
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <Sunset size={12} />
              <span>Sore (17:00)</span>
            </button>
          </div>
        </div>

        {/* Interactive Hour Selector Bar */}
        <div className="p-4 sm:px-6 bg-zinc-50/40 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Compass size={14} className="text-blue-600" />
              Pilih Jam untuk Melihat Situasi Ruas Jalan:
            </span>
            <span className="text-xs font-bold text-zinc-900 bg-white border border-zinc-200/80 px-2.5 py-0.5 rounded-md shadow-2xs">
              Pukul {selectedHour.toString().padStart(2, "0")}:00 WIB
            </span>
          </div>

          {/* 24-Hour Slider Buttons */}
          <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1">
            {Array.from({ length: 24 }).map((_, h) => {
              const isSelected = selectedHour === h;
              const isNow = currentHourOnServer === h;
              const isRush = (h >= 7 && h <= 8) || (h >= 16 && h <= 18);

              return (
                <button
                  key={h}
                  onClick={() => setSelectedHour(h)}
                  title={`Pukul ${h.toString().padStart(2, "0")}:00`}
                  className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-zinc-900 text-white shadow-xs scale-105 z-10 ring-2 ring-blue-500/50"
                      : isNow
                      ? "bg-blue-100 text-blue-900 border border-blue-300 font-semibold"
                      : isRush
                      ? "bg-amber-100/70 text-amber-900 hover:bg-amber-200 border border-amber-200/60"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/60"
                  }`}
                >
                  <span>{h.toString().padStart(2, "0")}</span>
                  <span className="text-[9px] opacity-70">00</span>
                  {isNow && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-600" />
                Jam Sekarang ({currentHourOnServer.toString().padStart(2, "0")}:00)
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-400" />
                Jam Sibuk Komuter
              </span>
            </div>
            <span>Geser atau klik jam di atas untuk simulasi waktu</span>
          </div>
        </div>

        {/* Selected Hour Insight Cards */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 rounded-xl p-3.5 border border-zinc-200/80">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-white border border-zinc-200 text-zinc-800 shadow-2xs font-bold text-sm">
                {selectedHour.toString().padStart(2, "0")}:00
              </span>
              <div>
                <p className="text-xs font-semibold text-zinc-900">
                  Situasi Kota Palembang Pukul {selectedHour.toString().padStart(2, "0")}:00 WIB
                </p>
                <p className="text-[11px] text-zinc-500">
                  {hourStats.congested > 0
                    ? `Perhatian: Terdapat ${hourStats.congested} ruas jalan berstatus PADAT/MACET.`
                    : "Lalu lintas kota cenderung lancar mengalir pada jam ini."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 font-medium text-rose-700">
                {hourStats.congested} Padat/Macet
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
                {hourStats.moderate} Sedang
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                {hourStats.smooth} Lancar
              </span>
            </div>
          </div>

          {/* Area Cards for Selected Hour */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {data.areas.map((area) => {
              const status = area.hourly_status[selectedHour];
              const score = area.hourly_scores[selectedHour];
              const vpm = area.hourly_vpm[selectedHour];
              const color = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.LANCAR;

              return (
                <div
                  key={area.camera_id}
                  className={`rounded-xl border p-4 transition-all hover:shadow-xs ${color.bg} ${color.border} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        CCTV #{area.camera_id}
                      </span>
                      <StatusBadge status={status} />
                    </div>

                    <h3 className="mt-1.5 font-bold text-sm text-zinc-900 line-clamp-1">
                      {area.road_name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">{area.camera_name}</p>

                    {/* Progress Bar of Congestion */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1">
                        <span>Skor Kepadatan</span>
                        <b className="font-semibold tabular">{score}%</b>
                      </div>
                      <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            status === "MACET"
                              ? "bg-rose-600"
                              : status === "PADAT"
                              ? "bg-orange-500"
                              : status === "SEDANG"
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-600">
                      Est. <b className="font-semibold text-zinc-900 tabular">{vpm}</b> kend./menit
                    </span>
                    <Link
                      href={`/cctv/${area.camera_id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <span>Feed</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 24-Hour City Heatmap Matrix Table */}
        <div className="border-t border-zinc-200/80 p-5 sm:px-6 bg-white">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span>Matriks Kepadatan 24 Jam Antar Ruas Jalan</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-normal text-zinc-500">
                  Heatmap
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Klik pada blok jam mana saja untuk langsung mensimulasikan situasi kota pada jam tersebut.
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded bg-emerald-500" /> Lancar
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded bg-amber-400" /> Sedang
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded bg-orange-500" /> Padat
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded bg-rose-600" /> Macet
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] text-zinc-400 uppercase">
                  <th className="py-2 pr-4 font-semibold w-56">Ruas Jalan / Area</th>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th
                      key={h}
                      className={`text-center py-2 px-0.5 font-medium ${
                        selectedHour === h ? "text-blue-600 font-bold bg-blue-50/50 rounded-t" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="py-2 pl-3 font-semibold text-right">Jam Puncak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.areas.map((area) => (
                  <tr key={area.camera_id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-zinc-900">
                      <div className="truncate max-w-[210px]" title={area.road_name}>
                        {area.road_name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[210px]">
                        {area.camera_name}
                      </div>
                    </td>

                    {/* 24 Cells */}
                    {area.hourly_status.map((st, h) => {
                      const isSel = selectedHour === h;
                      const cellColor =
                        st === "MACET"
                          ? "bg-rose-600 hover:bg-rose-700"
                          : st === "PADAT"
                          ? "bg-orange-500 hover:bg-orange-600"
                          : st === "SEDANG"
                          ? "bg-amber-400 hover:bg-amber-500"
                          : "bg-emerald-500 hover:bg-emerald-600";

                      return (
                        <td key={h} className={`p-0.5 text-center ${isSel ? "bg-blue-50/50" : ""}`}>
                          <button
                            onClick={() => setSelectedHour(h)}
                            title={`${area.road_name} pkl ${h}:00 - Status: ${st} (${area.hourly_scores[h]}%)`}
                            className={`size-5 rounded-xs transition-all mx-auto block ${cellColor} ${
                              isSel ? "ring-2 ring-zinc-900 ring-offset-1 scale-110" : "opacity-90 hover:opacity-100"
                            }`}
                          />
                        </td>
                      );
                    })}

                    <td className="py-2.5 pl-3 text-right">
                      <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                        {area.morning_peak || area.evening_peak || "07:00 & 17:00"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Peak Hours Breakdown Cards (Jam Padat di Area Mana Saja) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Morning Rush Highlight */}
        <div className="rounded-xl border border-orange-200/80 bg-gradient-to-br from-orange-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-orange-100 text-orange-700">
                <Sun size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Jam Sibuk Pagi</h3>
                <span className="text-[11px] font-semibold text-orange-700">
                  {data.city_morning_peak}
                </span>
              </div>
            </div>
            <span className="rounded-md bg-orange-100/80 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
              Berangkat
            </span>
          </div>

          <p className="text-xs text-zinc-600 mb-3">
            Arus padat pekerja kantor & pelajar menuju pusat kota. Area paling rawan macet pada jam ini:
          </p>

          <div className="space-y-2">
            {data.morning_peak_areas.map((item) => (
              <div
                key={item.camera_id}
                className="flex items-center justify-between rounded-lg border border-orange-100 bg-white/90 p-2.5 text-xs shadow-2xs"
              >
                <div>
                  <strong className="block font-semibold text-zinc-900">{item.road_name}</strong>
                  <span className="text-[10px] text-zinc-400">Puncak: {item.peak_window}</span>
                </div>
                <StatusBadge status={item.traffic_status} />
              </div>
            ))}
          </div>
        </div>

        {/* Evening Rush Highlight */}
        <div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-rose-100 text-rose-700">
                <Sunset size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Jam Sibuk Sore</h3>
                <span className="text-[11px] font-semibold text-rose-700">
                  {data.city_evening_peak}
                </span>
              </div>
            </div>
            <span className="rounded-md bg-rose-100/80 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
              Pulang Kantor
            </span>
          </div>

          <p className="text-xs text-zinc-600 mb-3">
            Arus kepulangan menuju pemukiman & titik simpul jembatan/persimpangan utama:
          </p>

          <div className="space-y-2">
            {data.evening_peak_areas.map((item) => (
              <div
                key={item.camera_id}
                className="flex items-center justify-between rounded-lg border border-rose-100 bg-white/90 p-2.5 text-xs shadow-2xs"
              >
                <div>
                  <strong className="block font-semibold text-zinc-900">{item.road_name}</strong>
                  <span className="text-[10px] text-zinc-400">Puncak: {item.peak_window}</span>
                </div>
                <StatusBadge status={item.traffic_status} />
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours & Tips */}
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-xs md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Moon size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Jam Paling Lengang</h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {data.quietest_hours[0] || "22:00 - 05:00 WIB"}
                </span>
              </div>
            </div>
            <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              Lancar
            </span>
          </div>

          <p className="text-xs text-zinc-600 mb-3">
            Waktu terbaik untuk melintasi jalan protokol tanpa hambatan berarti:
          </p>

          <div className="space-y-2.5 text-xs text-zinc-700">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-white/90 p-2.5 shadow-2xs">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-zinc-900">Malam & Dini Hari (22:00 - 05:30)</strong>
                <p className="text-[11px] text-zinc-500">Semua koridor 100% berstatus LANCAR.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-white/90 p-2.5 shadow-2xs">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-zinc-900">Jeda Pagi-Siang (10:00 - 11:30)</strong>
                <p className="text-[11px] text-zinc-500">Penurunan volume setelah arus komuter pagi usai.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-white/90 p-2.5 shadow-2xs">
              <Sparkles size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-zinc-900">Saran Rute Komuter</strong>
                <p className="text-[11px] text-zinc-500">
                  Gunakan menu <Link href="/routes" className="underline font-medium text-blue-600">Rute Saya</Link> untuk panduan jalur alternatif otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
