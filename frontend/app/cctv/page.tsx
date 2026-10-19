"use client";

import {
  Activity,
  ArrowRight,
  Compass,
  Gauge,
  MapPin,
  Maximize2,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ErrorState, LoadingCards, StatusBadge } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Camera, TrafficCurrent, TrafficStatus } from "@/lib/types";
import { cleanCameraName, cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type FilterStatus = "ALL" | TrafficStatus;

const statusThemes: Record<
  TrafficStatus,
  {
    borderTop: string;
    cardBorder: string;
    hoverGlow: string;
  }
> = {
  LANCAR: {
    borderTop: "border-t-emerald-500",
    cardBorder: "border-slate-200/90 hover:border-emerald-300",
    hoverGlow: "hover:shadow-[0_4px_20px_rgba(16,185,129,0.12)]",
  },
  SEDANG: {
    borderTop: "border-t-amber-500",
    cardBorder: "border-slate-200/90 hover:border-amber-300",
    hoverGlow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.12)]",
  },
  PADAT: {
    borderTop: "border-t-orange-500",
    cardBorder: "border-slate-200/90 hover:border-orange-300",
    hoverGlow: "hover:shadow-[0_4px_20px_rgba(249,115,22,0.12)]",
  },
  MACET: {
    borderTop: "border-t-rose-500",
    cardBorder: "border-slate-200/90 hover:border-rose-300",
    hoverGlow: "hover:shadow-[0_4px_20px_rgba(244,63,94,0.12)]",
  },
};

function CameraCard({
  camera,
  trafficItem,
}: {
  camera: Camera;
  trafficItem?: TrafficCurrent;
}) {
  const displayName = cleanCameraName(camera.name);
  const channelId = `CAM-${String(camera.id).padStart(2, "0")}`;
  const status = trafficItem?.traffic_status ?? "LANCAR";
  const theme = statusThemes[status] ?? statusThemes.LANCAR;

  return (
    <Link
      href={`/cctv/${camera.id}`}
      key={camera.id}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-t-[3px] transition-all duration-200 shadow-xs",
        theme.borderTop,
        theme.cardBorder,
        theme.hoverGlow,
        "bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/70"
      )}
    >
      {/* Camera Location Photo with Live HUD Overlay */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 select-none">
        {/* Generated 2D Ampera CCTV Artwork */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cameras/ampera-cctv.jpg?v=1"
          alt={`${displayName} - Ampera CCTV`}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Top Gradient for Badge Readability */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />

        {/* Bottom Gradient for Telemetry Readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top Badges Overlay on Photo */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs shadow-xs">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wider">LIVE</span>
        </div>

        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {camera.is_demo && (
            <span className="rounded-md border border-amber-300/40 bg-amber-500/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-xs shadow-xs">
              DEMO
            </span>
          )}
          <span className="rounded-md border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-[10px] font-medium text-white/95 backdrop-blur-xs shadow-xs">
            {channelId}
          </span>
        </div>

        {/* Bottom Telemetry Overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-3 py-1.5 text-[10px] text-white/90">
          <span className="flex items-center gap-1.5 font-medium text-white/80">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>1080p · 25 FPS</span>
          </span>
          <span className="font-semibold tabular text-white drop-shadow-xs">
            {trafficItem?.rolling_5_minute ?? 0} kend / 5m
          </span>
        </div>

        {/* Hover Overlay with Quick Action */}
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-2xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-md transition-transform group-hover:scale-105">
            <Maximize2 size={13} />
            <span>Pantau Siaran Langsung</span>
            <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* Card Content Area (Layered Depth Tone) */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header: Clean Camera Name & Status Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {displayName}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} className="shrink-0 text-slate-400" />
                <span className="truncate">{camera.road_name}</span>
              </div>
            </div>
            {trafficItem && (
              <div className="shrink-0">
                <StatusBadge status={trafficItem.traffic_status} />
              </div>
            )}
          </div>

          {/* 2-Column Telemetry Bento Tiles with Contrast Background */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3">
            <div className="rounded-lg bg-white/90 p-2.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Arus 5 Menit</span>
                <Activity size={11} className="text-slate-400" />
              </div>
              <div className="text-sm font-bold tabular text-slate-900 mt-1">
                {trafficItem?.rolling_5_minute ?? 0}{" "}
                <span className="text-[10px] font-normal text-slate-500">kend</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/90 p-2.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Laju Aliran</span>
                <Gauge size={11} className="text-slate-400" />
              </div>
              <div className="text-sm font-bold tabular text-slate-900 mt-1">
                {trafficItem?.vehicles_per_minute ?? 0}{" "}
                <span className="text-[10px] font-normal text-slate-500">kend/m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Micro Footer Action Anchored with Subtle Tint */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 bg-slate-100/50 -mx-3.5 -mb-3.5 px-3.5 pb-2.5 pt-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kamera Online</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
            <span>Lihat Analisis</span>
            <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CctvPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const debouncedQuery = useDebounce(searchQuery, 250);

  const { data: cameras, error, mutate } = useSWR<Camera[]>("/api/cameras", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });

  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, {
    refreshInterval: 10_000,
  });

  // Hitung jumlah kamera per status
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      ALL: cameras?.length ?? 0,
      LANCAR: 0,
      SEDANG: 0,
      PADAT: 0,
      MACET: 0,
    };
    if (!cameras || !traffic) return counts;
    for (const cam of cameras) {
      const item = traffic.find((t) => t.camera_id === cam.id);
      const s = item?.traffic_status;
      if (s && s in counts) {
        counts[s]++;
      }
    }
    return counts;
  }, [cameras, traffic]);

  // Filter kamera berdasarkan nama, jalan, dan filter status
  const filteredCameras = useMemo(() => {
    if (!cameras) return [];
    let list = cameras;

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      list = list.filter((camera) => {
        const cleanName = cleanCameraName(camera.name).toLowerCase();
        const rawName = camera.name.toLowerCase();
        const road = camera.road_name.toLowerCase();
        return cleanName.includes(q) || rawName.includes(q) || road.includes(q);
      });
    }

    if (statusFilter !== "ALL") {
      list = list.filter((camera) => {
        const current = traffic?.find((t) => t.camera_id === camera.id);
        return current?.traffic_status === statusFilter;
      });
    }

    return list;
  }, [cameras, traffic, debouncedQuery, statusFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      await mutateApi("/api/cameras", "POST", {
        name: values.get("name"),
        road_name: values.get("road_name"),
        latitude: Number(values.get("latitude")),
        longitude: Number(values.get("longitude")),
        stream_type: values.get("stream_type"),
        stream_url: values.get("stream_url") || null,
        is_active: true,
        is_demo: values.get("is_demo") === "on",
        low_threshold: 20,
        medium_threshold: 45,
        high_threshold: 75,
      });
      await mutate();
      setAdding(false);
      event.currentTarget.reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menambah kamera");
    }
  }

  return (
    <div className="space-y-6">
      {/* 21st.dev Sleek Minimalist Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Palembang Smart Mobility</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Kamera CCTV</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Jaringan Kamera CCTV Kota
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Siaran langsung kamera lalu lintas dengan telemetri volume 5 menit dan klasifikasi kendaraan real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>{adding ? "Tutup Form" : "Tambah CCTV"}</span>
            </button>
          )}
          <Link
            href="/map"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <Compass size={13} />
            <span>Peta Spasial</span>
          </Link>
        </div>
      </div>

      {/* Admin Form: Add CCTV */}
      {isAdmin && adding && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tambah Kamera CCTV Baru</h3>
              <p className="text-xs text-slate-500">Konfigurasi endpoint streaming dan koordinat geolokasi.</p>
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Nama Titik Kamera</label>
              <input
                required
                name="name"
                placeholder="Contoh: Simpang Polda"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Nama Ruas Jalan</label>
              <input
                required
                name="road_name"
                placeholder="Contoh: Jl. Jend. Sudirman"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Latitude</label>
              <input
                required
                name="latitude"
                type="number"
                step="any"
                defaultValue="-2.976"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Longitude</label>
              <input
                required
                name="longitude"
                type="number"
                step="any"
                defaultValue="104.748"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Tipe Stream</label>
              <select
                name="stream_type"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="local">Local Video Sample</option>
                <option value="hls">HLS Stream (.m3u8)</option>
                <option value="rtsp">RTSP Feed</option>
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-slate-700">URL Stream (Opsional)</label>
              <input
                name="stream_url"
                placeholder="https://... atau biarkan kosong untuk feed default"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 self-end py-2">
              <input
                type="checkbox"
                id="is_demo"
                name="is_demo"
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <label htmlFor="is_demo" className="text-xs font-medium text-slate-700 cursor-pointer">
                Tandai DEMO
              </label>
            </div>
            <div className="lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 transition-colors"
              >
                Simpan Kamera
              </button>
            </div>
            {message && (
              <p className="text-xs text-rose-600 lg:col-span-6">{message}</p>
            )}
          </div>
        </form>
      )}

      {/* Toolbar: Compact Search & Segmented Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Status Filter Segmented Pills */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
              statusFilter === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            Semua ({statusCounts.ALL})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("LANCAR")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
              statusFilter === "LANCAR"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Lancar ({statusCounts.LANCAR})</span>
          </button>
          {statusCounts.SEDANG > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("SEDANG")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                statusFilter === "SEDANG"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Sedang ({statusCounts.SEDANG})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setStatusFilter("PADAT")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
              statusFilter === "PADAT"
                ? "bg-orange-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            <span className="size-1.5 rounded-full bg-orange-500" />
            <span>Padat ({statusCounts.PADAT})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("MACET")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
              statusFilter === "MACET"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            <span className="size-1.5 rounded-full bg-rose-500" />
            <span>Macet ({statusCounts.MACET})</span>
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter kamera atau jalan..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
              title="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : !cameras ? (
        <LoadingCards count={4} />
      ) : filteredCameras.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Search size={18} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            Tidak Ada Titik CCTV Ditemukan
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ditemukan kamera dengan kata kunci "${searchQuery}".`
              : "Tidak ada kamera yang cocok dengan filter status terpilih."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCameras.map((camera) => {
            const current = traffic?.find((item) => item.camera_id === camera.id);
            return (
              <CameraCard
                key={camera.id}
                camera={camera}
                trafficItem={current}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
