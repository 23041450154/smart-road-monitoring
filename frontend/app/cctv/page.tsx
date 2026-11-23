"use client";

import { Activity, ArrowRight, Compass, Gauge, MapPin, Maximize2, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ErrorState, LoadingCards, StatusBadge } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Camera, TrafficCurrent, TrafficStatus } from "@/lib/types";
import { cleanCameraName, cn, fiveMinuteWindowLabel } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

type FilterStatus = "ALL" | TrafficStatus;

function CameraCard({
  camera,
  trafficItem,
}: {
  camera: Camera;
  trafficItem?: TrafficCurrent;
}) {
  const displayName = cleanCameraName(camera.name);
  const channelId = `CAM-${String(camera.id).padStart(2, "0")}`;
  const windowRange = fiveMinuteWindowLabel(trafficItem?.timestamp);

  return (
    <Link
      href={`/cctv/${camera.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-300 shadow-2xs"
    >
      {/* Camera Location Photo with High-Contrast Scrim Bars */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cameras/ampera-cctv.jpg?v=1"
          alt={`${displayName} - CCTV`}
          width={640}
          height={360}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Top Scrim Bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold text-white">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="tracking-wider">LIVE</span>
          </span>
          <div className="flex items-center gap-2">
            {camera.is_demo && (
              <span className="font-mono text-[9px] font-bold text-amber-300">
                DEMO
              </span>
            )}
            <span className="font-mono font-medium text-white">
              {channelId}
            </span>
          </div>
        </div>

        {/* Bottom Scrim Bar */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-slate-950/75 px-3 py-1.5 text-[10px] text-white">
          <span className="font-mono font-medium text-slate-200 tabular">
            {windowRange}
          </span>
          <span className="font-semibold tabular text-white">
            {trafficItem?.rolling_5_minute ?? 0} kend / 5m
          </span>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-md">
            <Maximize2 size={13} aria-hidden="true" />
            <span>Pantau Siaran Langsung</span>
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                {displayName}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                <MapPin size={11} aria-hidden="true" className="shrink-0 text-slate-600" />
                <span className="truncate">{camera.road_name}</span>
              </div>
            </div>
            {trafficItem ? (
              <div className="shrink-0">
                <StatusBadge status={trafficItem.traffic_status} />
              </div>
            ) : (
              <span className="shrink-0 text-[11px] text-slate-600">Menunggu</span>
            )}
          </div>

          {/* 2-Column Telemetry with Explicit 5-Minute Time Range */}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span>Arus 5 Menit</span>
                <Activity size={11} aria-hidden="true" />
              </div>
              <div className="text-sm font-bold tabular text-slate-900 mt-0.5">
                {trafficItem?.rolling_5_minute ?? 0}{" "}
                <span className="text-[11px] font-normal text-slate-600">kend</span>
              </div>
              <span className="mt-0.5 block font-mono text-[10px] text-slate-600 tabular">
                {windowRange}
              </span>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span>Laju Aliran</span>
                <Gauge size={11} aria-hidden="true" />
              </div>
              <div className="text-sm font-bold tabular text-slate-900 mt-0.5">
                {trafficItem?.vehicles_per_minute ?? 0}{" "}
                <span className="text-[11px] font-normal text-slate-600">kend/m</span>
              </div>
              <span className="mt-0.5 block text-[10px] text-slate-600">
                Rata-rata per menit
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>Kamera Online</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
            <span>Lihat Analisis</span>
            <ArrowRight size={11} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
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
    refreshInterval: 20_000,
    keepPreviousData: true,
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 3000,
  });

  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, {
    refreshInterval: 15_000,
    keepPreviousData: true,
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 3000,
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Jaringan Kamera CCTV Palembang
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pilih titik kamera untuk memantau siaran langsung, volume kendaraan 5 menit, dan pola kepadatan per jam.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-expanded={adding}
              className="inline-flex min-h-[44px] sm:min-h-[38px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors"
            >
              <Plus size={14} aria-hidden="true" />
              <span>{adding ? "Tutup Form" : "Tambah CCTV"}</span>
            </button>
          )}
          <Link
            href="/map"
            className="inline-flex min-h-[44px] sm:min-h-[38px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors"
          >
            <Compass size={14} aria-hidden="true" />
            <span>Peta Spasial</span>
          </Link>
        </div>
      </div>

      {isAdmin && adding && (
        <form
          onSubmit={submit}
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tambah Kamera CCTV Baru</h2>
              <p className="text-xs text-slate-600">Konfigurasi endpoint streaming dan koordinat geolokasi.</p>
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Tutup form tambah kamera"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label htmlFor="cam-name" className="block text-xs font-medium text-slate-700">Nama Titik Kamera</label>
              <input
                id="cam-name"
                required
                name="name"
                placeholder="Contoh: Simpang Polda"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-600"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="cam-road" className="block text-xs font-medium text-slate-700">Nama Ruas Jalan</label>
              <input
                id="cam-road"
                required
                name="road_name"
                placeholder="Contoh: Jl. Jend. Sudirman"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="cam-lat" className="block text-xs font-medium text-slate-700">Latitude</label>
              <input
                id="cam-lat"
                required
                name="latitude"
                type="number"
                step="any"
                defaultValue="-2.976"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="cam-lng" className="block text-xs font-medium text-slate-700">Longitude</label>
              <input
                id="cam-lng"
                required
                name="longitude"
                type="number"
                step="any"
                defaultValue="104.748"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="cam-type" className="block text-xs font-medium text-slate-700">Tipe Stream</label>
              <select
                id="cam-type"
                name="stream_type"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600"
              >
                <option value="local">Local Video Sample</option>
                <option value="hls">HLS Stream (.m3u8)</option>
                <option value="rtsp">RTSP Feed</option>
              </select>
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="cam-url" className="block text-xs font-medium text-slate-700">URL Stream (Opsional)</label>
              <input
                id="cam-url"
                name="stream_url"
                placeholder="https://... atau kosongkan untuk default"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-600"
              />
            </div>
            <div className="flex items-center gap-2 self-end py-2">
              <input
                type="checkbox"
                id="is_demo"
                name="is_demo"
                className="rounded border-slate-300 text-blue-700"
              />
              <label htmlFor="is_demo" className="text-xs font-medium text-slate-700">
                Tandai DEMO
              </label>
            </div>
            <div className="lg:col-span-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                Simpan Kamera
              </button>
            </div>
            {message && (
              <p className="text-xs text-rose-700 lg:col-span-6">{message}</p>
            )}
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter status lalu lintas"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 overflow-x-auto"
        >
          {(
            [
              { key: "ALL", label: `Semua (${statusCounts.ALL})`, activeClass: "bg-slate-900 text-white" },
              { key: "LANCAR", label: `Lancar (${statusCounts.LANCAR})`, activeClass: "bg-emerald-700 text-white" },
              ...(statusCounts.SEDANG > 0
                ? [{ key: "SEDANG" as const, label: `Sedang (${statusCounts.SEDANG})`, activeClass: "bg-amber-700 text-white" }]
                : []),
              { key: "PADAT", label: `Padat (${statusCounts.PADAT})`, activeClass: "bg-orange-700 text-white" },
              { key: "MACET", label: `Macet (${statusCounts.MACET})`, activeClass: "bg-rose-700 text-white" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "min-h-[38px] sm:min-h-[32px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                statusFilter === tab.key
                  ? tab.activeClass
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-600">
            <Search size={14} aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter kamera atau jalan"
            placeholder="Cari kamera atau jalan..."
            className="h-11 sm:h-9 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-9 text-xs text-slate-900 placeholder:text-slate-600 focus:border-blue-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus pencarian"
              className="absolute inset-y-0 right-0 flex min-w-[36px] items-center justify-center text-slate-600 hover:text-slate-900"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!cameras && error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : !cameras ? (
        <LoadingCards count={4} />
      ) : filteredCameras.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Tidak Ada Titik CCTV Ditemukan
          </p>
          <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
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
            className="mt-4 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filter
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
