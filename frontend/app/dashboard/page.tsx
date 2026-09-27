"use client";

import Link from "next/link";
import {
  Activity,
  Camera,
  Construction,
  ExternalLink,
  MapPin,
  Radio,
  Route as RouteIcon,
} from "lucide-react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { TrafficCharts } from "@/components/traffic-charts";
import {
  ErrorState,
  LoadingCards,
  PageHeading,
  StatusBadge,
  TrendView,
} from "@/components/ui";
import { fetcher } from "@/lib/api";
import type {
  Camera as CameraType,
  Pothole,
  Route,
  Summary,
  TrafficCurrent,
} from "@/lib/types";
import { dateTime, routeLabel } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, error: summaryError } = useSWR<Summary>(
    "/api/traffic/summary",
    fetcher,
    { refreshInterval: 30_000 },
  );
  const { data: traffic, error: trafficError } = useSWR<TrafficCurrent[]>(
    "/api/traffic/current",
    fetcher,
    { refreshInterval: 15_000 },
  );
  const { data: cameras } = useSWR<CameraType[]>("/api/cameras", fetcher);
  const { data: potholes } = useSWR<Pothole[]>("/api/potholes", fetcher);
  const { data: routes } = useSWR<Route[]>("/api/routes", fetcher);

  const activeRoute = routes?.[0];

  const cards = summary
    ? [
        {
          label: "CCTV Aktif",
          value: summary.cctv_online,
          icon: Camera,
          note: "Titik kamera aktif terhubung",
        },
        {
          label: "Arus Kendaraan (5 Menit)",
          value: summary.vehicles_last_5_minutes,
          icon: Activity,
          note: "Agregat seluruh sensor kamera",
        },
        {
          label: "Koridor Padat",
          value: summary.congested_roads,
          icon: RouteIcon,
          note: "Ruas jalan berstatus PADAT / MACET",
        },
        {
          label: "Titik Jalan Berlubang",
          value: summary.detected_potholes,
          icon: Construction,
          note: "Deteksi aktif dalam verifikasi",
        },
      ]
    : [];

  return (
    <>
      <PageHeading
        eyebrow="Ringkasan Operasional"
        title="Selamat Datang di Pusat Kendali Palembang"
        description="Pemantauan terpadu arus lalu lintas, analisis volume CCTV berbasis computer vision, dan pemetaan rute perkotaan secara real-time."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>
              Live · {summary ? dateTime(summary.generated_at) : "Menghubungkan..."}
            </span>
          </div>
        }
      />

      {summaryError || trafficError ? (
        <ErrorState />
      ) : !summary || !traffic ? (
        <LoadingCards />
      ) : (
        <>
          {summary.demo_mode && (
            <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Mode Simulasi / Demo Aktif:</strong> Angka yang
                  ditampilkan mencakup data uji coba untuk validasi pipeline.
                </span>
              </div>
              <span className="hidden sm:inline-block rounded border border-amber-300 bg-amber-100/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900 uppercase">
                Demo
              </span>
            </div>
          )}

          {/* Metric Cards Grid */}
          <section className="grid gap-3 grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.label}
                  className="rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-500 line-clamp-1">
                      {card.label}
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100/80 text-zinc-600">
                      <Icon size={16} />
                    </span>
                  </div>
                  <strong className="block text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular">
                    {card.value.toLocaleString("id-ID")}
                  </strong>
                  <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">
                    {card.note}
                  </p>
                </article>
              );
            })}
          </section>

          {/* Map Section */}
          <section className="mt-6 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 p-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-zinc-700 shrink-0" />
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Kondisi Jalan & Peta Terpadu
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {activeRoute
                    ? `Menampilkan rute utama: ${activeRoute.name} (${routeLabel(activeRoute.route_type)})`
                    : "Sebaran titik kamera pengawas CCTV dan laporan infrastruktur jalan"}
                </p>
              </div>
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shrink-0 shadow-xs"
              >
                <span>Buka Peta Lengkap</span>
                <ExternalLink size={13} />
              </Link>
            </div>
            <div className="h-[300px] sm:h-[400px] w-full">
              <MapPanel
                cameras={cameras}
                potholes={potholes}
                routes={routes}
                traffic={traffic}
                selectedRouteId={activeRoute?.id}
                showLegend={false}
              />
            </div>
          </section>

          {/* Charts & Ruas Jalan Status Grid */}
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
            <TrafficCharts traffic={traffic} />

            {/* Ruas Jalan List */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Status Ruas Jalan Terpantau
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Pembaruan langsung dari pemrosesan video CCTV
                    </p>
                  </div>
                  <Activity size={18} className="text-zinc-400" />
                </div>

                <div className="space-y-2.5">
                  {traffic.map((item) => (
                    <div
                      key={item.camera_id}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3.5 transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-sm font-semibold text-zinc-900">
                            {item.road_name}
                          </strong>
                          <span className="text-[11px] text-zinc-400">
                            {item.camera_name}
                          </span>
                        </div>
                        <StatusBadge status={item.traffic_status} />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
                        <span className="text-zinc-500">
                          <b className="text-zinc-900 font-semibold tabular">
                            {item.vehicles_per_minute}
                          </b>{" "}
                          kendaraan/menit
                        </span>
                        <TrendView trend={item.trend} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
