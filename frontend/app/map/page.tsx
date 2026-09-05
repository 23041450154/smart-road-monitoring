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
    refreshInterval: 30_000, // 30 seconds auto-refresh
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
    { refreshInterval: 30_000 }
  );


  const nearbyCameraIds = briefing?.traffic.map((t) => t.camera_id) ?? [];
  const nearbyPotholeIds = briefing?.potholes.map((p) => p.id) ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Peta spasial cerdas"
        title="Palembang dalam Satu Peta"
        description="Pantau arus CCTV, deteksi jalan berlubang, dan sinkronisasi rute perjalanan commute harian."
        action={
          <button
            type="button"
            onClick={() => {
              mutateTraffic();
              mutateCameras();
              mutatePotholes();
              mutateRoutes();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw size={13} className="text-emerald-700" />
            <span>Segarkan Arus</span>
          </button>
        }
      />

      {/* Layer Filter Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
        {/* Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
            <Layers size={13} /> Layer:
          </span>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showCctv}
              onChange={(e) => setShowCctv(e.target.checked)}
              className="accent-emerald-700"
            />
            <CameraIcon size={14} className="text-emerald-800" />
            <span>CCTV ({cameras?.length ?? 0})</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showPotholes}
              onChange={(e) => setShowPotholes(e.target.checked)}
              className="accent-amber-600"
            />
            <Construction size={14} className="text-amber-600" />
            <span>Lubang ({potholes?.length ?? 0})</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="accent-blue-600"
            />
            <RouteIcon size={14} className="text-blue-600" />
            <span>Rute ({routes?.length ?? 0})</span>
          </label>
        </div>

        {/* Status Filters & Route Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {showCctv && (
            <div className="flex items-center gap-1">
              <Filter size={12} className="text-slate-400" />
              <select
                value={trafficFilter}
                onChange={(e) => setTrafficFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium outline-none"
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
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium outline-none"
            >
              <option value="all">Semua Status Lubang</option>
              <option value="active">Aktif</option>
              <option value="unverified">Belum Diverifikasi</option>
              <option value="repaired">Telah Diperbaiki</option>
            </select>
          )}

          {/* Route Dropdown Selector */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
            <span className="font-bold text-slate-500">Rute:</span>
            <select
              value={selectedRouteId ?? ""}
              onChange={(e) => setSelectedRouteId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 outline-none"
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
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <p className="font-bold">Sebagian data tidak dapat dimuat dari API:</p>
          <ul className="mt-1 list-inside list-disc">
            {camerasError && <li>Gagal memuat daftar CCTV.</li>}
            {trafficError && <li>Gagal memuat status arus kendaraan terbaru.</li>}
            {potholesError && <li>Gagal memuat titik jalan berlubang.</li>}
            {routesError && <li>Gagal memuat rute tersimpan.</li>}
          </ul>
        </div>
      )}

      {/* Main Map Container + Briefing Sidepanel */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_.75fr]">
        <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-xl">
          <div className="h-[52vh] min-h-[360px] sm:h-[65vh] sm:min-h-[480px] lg:h-[72vh] lg:min-h-[500px]">
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
              <article className="rounded-3xl bg-[#102c27] p-5 text-white shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-emerald-400">
                    <MessageSquareText size={18} />
                  </span>
                  <StatusBadge status={briefing.overall_status} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#c9f260]">
                  Briefing Rute · {routeLabel(briefing.route_type)}
                </span>
                <h3 className="mt-1 text-lg font-bold">{briefing.route_name}</h3>
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-white/80">
                  {briefing.message}
                </p>
              </article>

              {/* Cameras Near Route */}
              <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CameraIcon size={16} className="text-emerald-700" />
                    <h4 className="text-xs font-bold text-slate-800">
                      CCTV Dekat Rute ({briefing.traffic.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Buffer 500m</span>
                </div>
                {briefing.traffic.length === 0 ? (
                  <p className="text-xs text-slate-500">Tidak ada CCTV di sepanjang rute ini.</p>
                ) : (
                  <div className="space-y-2">
                    {briefing.traffic.map((cam) => (
                      <div
                        key={cam.camera_id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <strong className="text-slate-800">{cam.road_name}</strong>
                          <StatusBadge status={cam.traffic_status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                          <span>{cam.vehicles_per_minute} kend./menit</span>
                          <TrendView trend={cam.trend} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Potholes Near Route */}
              <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Construction size={16} className="text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Lubang Jalan Dekat Rute ({briefing.potholes.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Buffer 100m</span>
                </div>
                {briefing.potholes.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Kondisi aman, tidak ada lubang terdeteksi di rute ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {briefing.potholes.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-amber-100 bg-amber-50/50 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-800">
                            {p.road_name ?? `Lubang #${p.id}`}
                          </strong>
                          <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            {p.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Kepastian model: {Math.round(p.confidence * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <Sparkles size={28} className="mx-auto text-emerald-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Pilih Rute Commute</h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Pilih salah satu rute tersimpan dari menu di atas atau klik garis rute pada peta
                untuk melihat briefing otomatis, kondisi CCTV, dan peringatan lubang jalan di
                sepanjang lintasan.
              </p>

              <div className="mt-6 border-t border-slate-100 pt-4 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ringkasan Data Peta
                </span>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Kamera CCTV Aktif:</span>
                    <b className="text-slate-900">{cameras?.length ?? 0}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Jalan Berlubang Terdata:</span>
                    <b className="text-slate-900">{potholes?.length ?? 0}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Rute Tersimpan:</span>
                    <b className="text-slate-900">{routes?.length ?? 0}</b>
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
