"use client";

import { useState } from "react";
import {
  Camera as CameraIcon,
  Construction,
  Filter,
  Layers,
  MessageSquareText,
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Briefing, Camera, Pothole, Route, TrafficCurrent } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

export default function MapPage() {
  // Layer visibility toggles
  const [showCctv, setShowCctv] = useState(true);
  const [showPotholes, setShowPotholes] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  // Status filters
  const [trafficFilter, setTrafficFilter] = useState("all");
  const [potholeFilter, setPotholeFilter] = useState("all");

  // Selected route for briefing & highlighting
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  // Fetch data with independent error boundaries
  const {
    data: cameras,
    error: camerasError,
    mutate: mutateCameras,
  } = useSWR<Camera[]>("/api/cameras", fetcher);

  const {
    data: traffic,
    error: trafficError,
    mutate: mutateTraffic,
  } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, {
    refreshInterval: 30_000,
  });

  const {
    data: potholes,
    error: potholesError,
    mutate: mutatePotholes,
  } = useSWR<Pothole[]>("/api/potholes", fetcher);

  const {
    data: routes,
    error: routesError,
    mutate: mutateRoutes,
  } = useSWR<Route[]>("/api/routes", fetcher);

  // Fetch route briefing when a route is selected
  const { data: briefing } = useSWR<Briefing>(
    selectedRouteId ? `/api/routes/${selectedRouteId}/briefing` : null,
    fetcher,
    { refreshInterval: 30_000 },
  );

  const nearbyCameraIds = briefing?.traffic.map((t) => t.camera_id) ?? [];
  const nearbyPotholeIds = briefing?.potholes.map((p) => p.id) ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Peta Spasial Geografis"
        title="Pemetaan Cerdas Wilayah Palembang"
        description="Pantau konsentrasi volume CCTV, sebaran titik jalan berlubang, serta geometri lintasan rute harian dalam satu kanvas peta terpadu."
        action={
          <button
            type="button"
            onClick={() => {
              mutateTraffic();
              mutateCameras();
              mutatePotholes();
              mutateRoutes();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw size={13} className="text-zinc-600" />
            <span>Segarkan Data</span>
          </button>
        }
      />

      {/* Layer Filter Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 sm:p-3.5 shadow-xs">
        {/* Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Layers size={13} /> Layer:
          </span>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 hover:bg-zinc-50 transition-colors">
            <input
              type="checkbox"
              checked={showCctv}
              onChange={(e) => setShowCctv(e.target.checked)}
              className="accent-zinc-900 rounded"
            />
            <CameraIcon size={13} className="text-zinc-600" />
            <span className="text-zinc-700">CCTV ({cameras?.length ?? 0})</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 hover:bg-zinc-50 transition-colors">
            <input
              type="checkbox"
              checked={showPotholes}
              onChange={(e) => setShowPotholes(e.target.checked)}
              className="accent-zinc-900 rounded"
            />
            <Construction size={13} className="text-zinc-600" />
            <span className="text-zinc-700">Lubang ({potholes?.length ?? 0})</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 hover:bg-zinc-50 transition-colors">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="accent-zinc-900 rounded"
            />
            <RouteIcon size={13} className="text-zinc-600" />
            <span className="text-zinc-700">Rute ({routes?.length ?? 0})</span>
          </label>
        </div>

        {/* Status Filters & Route Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {showCctv && (
            <div className="flex items-center gap-1">
              <Filter size={12} className="text-zinc-400" />
              <select
                value={trafficFilter}
                onChange={(e) => setTrafficFilter(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-400"
              >
                <option value="all">Semua Arus CCTV</option>
                <option value="LANCAR">Lancar</option>
                <option value="SEDANG">Sedang</option>
                <option value="PADAT">Padat</option>
                <option value="MACET">Macet</option>
              </select>
            </div>
          )}

          {showPotholes && (
            <select
              value={potholeFilter}
              onChange={(e) => setPotholeFilter(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-400"
            >
              <option value="all">Semua Status Lubang</option>
              <option value="active">Aktif</option>
              <option value="unverified">Belum Diverifikasi</option>
              <option value="repaired">Telah Diperbaiki</option>
            </select>
          )}

          {/* Route Dropdown Selector */}
          <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-2">
            <span className="text-xs font-medium text-zinc-500">Rute:</span>
            <select
              value={selectedRouteId ?? ""}
              onChange={(e) =>
                setSelectedRouteId(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 outline-none focus:border-zinc-400"
            >
              <option value="">Semua Rute (Overview)</option>
              {routes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({routeLabel(r.route_type)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banners if any layer fails */}
      {(camerasError || potholesError || routesError || trafficError) && (
        <div className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs text-rose-800">
          <p className="font-semibold">Sebagian data tidak dapat dimuat:</p>
          <ul className="mt-1 list-inside list-disc">
            {camerasError && <li>Gagal memuat daftar CCTV.</li>}
            {trafficError && <li>Gagal memuat status arus kendaraan terbaru.</li>}
            {potholesError && <li>Gagal memuat titik jalan berlubang.</li>}
            {routesError && <li>Gagal memuat rute tersimpan.</li>}
          </ul>
        </div>
      )}

      {/* Main Map Container + Briefing Sidepanel */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_.75fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
          <div className="h-[52vh] min-h-[360px] sm:h-[65vh] sm:min-h-[480px] lg:h-[72vh] lg:min-h-[520px]">
            <MapPanel
              cameras={cameras}
              potholes={potholes}
              routes={routes}
              traffic={traffic}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              showCctvLayer={showCctv}
              showPotholeLayer={showPotholes}
              showRouteLayer={showRoutes}
              filterTraffic={trafficFilter}
              filterPothole={potholeFilter}
              dimUnrelated={!!selectedRouteId}
              nearbyCameraIds={nearbyCameraIds}
              nearbyPotholeIds={nearbyPotholeIds}
            />
          </div>
        </div>

        {/* Side Panel: Commute Briefing & Details */}
        <div className="flex flex-col gap-4">
          {selectedRouteId && briefing ? (
            <>
              <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                <div className="mb-3.5 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                      <MessageSquareText size={16} />
                    </span>
                    <div>
                      <span className="text-[11px] font-medium text-blue-600 block">
                        Briefing · {routeLabel(briefing.route_type)}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 leading-tight">
                        {briefing.route_name}
                      </h3>
                    </div>
                  </div>
                  <StatusBadge status={briefing.overall_status} />
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-600 bg-zinc-50/70 p-3 rounded-lg border border-zinc-100">
                  {briefing.message}
                </p>
              </article>

              {/* Cameras Near Route */}
              <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CameraIcon size={15} className="text-zinc-600" />
                    <h4 className="text-xs font-semibold text-zinc-900">
                      CCTV Dekat Rute ({briefing.traffic.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Buffer 500m</span>
                </div>
                {briefing.traffic.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Tidak ada kamera CCTV di koridor rute ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {briefing.traffic.map((cam) => (
                      <div
                        key={cam.camera_id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <strong className="text-zinc-800 font-medium">{cam.road_name}</strong>
                          <StatusBadge status={cam.traffic_status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                          <span>
                            <b className="text-zinc-800 font-semibold tabular">
                              {cam.vehicles_per_minute}
                            </b>{" "}
                            kend./menit
                          </span>
                          <TrendView trend={cam.trend} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Potholes Near Route */}
              <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Construction size={15} className="text-amber-600" />
                    <h4 className="text-xs font-semibold text-zinc-900">
                      Lubang Jalan Dekat Rute ({briefing.potholes.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Buffer 100m</span>
                </div>
                {briefing.potholes.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Kondisi aman, tidak ada lubang terdata di rute ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {briefing.potholes.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-amber-100 bg-amber-50/40 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-800 font-medium">
                            {p.road_name ?? `Lubang #${p.id}`}
                          </strong>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 uppercase">
                            {p.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Tingkat keyakinan model: {Math.round(p.confidence * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center shadow-xs">
              <Sparkles size={24} className="mx-auto text-zinc-400 mb-2" />
              <h4 className="text-sm font-semibold text-zinc-900">
                Pilih Rute Perjalanan
              </h4>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Pilih salah satu rute tersimpan untuk melihat kalkulasi kondisi CCTV, tingkat kepadatan lalu lintas, dan peringatan lubang jalan secara otomatis.
              </p>

              <div className="mt-5 border-t border-zinc-100 pt-3.5 text-left">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-2.5">
                  Statistik Ringkasan
                </span>
                <div className="space-y-2 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>Kamera CCTV Aktif:</span>
                    <b className="text-zinc-900 font-semibold tabular">{cameras?.length ?? 0}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Jalan Berlubang Terdata:</span>
                    <b className="text-zinc-900 font-semibold tabular">{potholes?.length ?? 0}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Rute Tersimpan:</span>
                    <b className="text-zinc-900 font-semibold tabular">{routes?.length ?? 0}</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
