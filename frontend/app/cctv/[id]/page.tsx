"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, Bus, Car, Maximize2, Minimize2, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, ErrorState, StatusBadge, TrendView } from "@/components/ui";
import { MapPanel } from "@/components/map-panel";
import { fetcher, getApiUrl } from "@/lib/api";
import type {
  Camera,
  HourlyProfileItem,
  HourlyProfileResponse,
  Snapshot,
  TrafficCurrent,
  TrafficPredictionResponse,
} from "@/lib/types";
import { cleanCameraName, dateTime, fiveMinuteWindowLabel } from "@/lib/utils";

export default function CameraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [streamKey, setStreamKey] = useState(0);
  const [streamError, setStreamError] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(17);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Gagal masuk mode layar penuh:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Gagal keluar mode layar penuh:", err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const { data: camera, error, mutate: mutateCamera } = useSWR<Camera>(`/api/cameras/${id}`, fetcher);
  const { data: current, error: currentError, mutate: mutateCurrent } = useSWR<TrafficCurrent>(
    `/api/cameras/${id}/traffic/current`,
    fetcher,
    { refreshInterval: 10_000 },
  );
  const { data: history } = useSWR<Snapshot[]>(
    `/api/cameras/${id}/traffic/history?hours=24`,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const { data: profileData } = useSWR<HourlyProfileResponse>(
    `/api/cameras/${id}/traffic/hourly-profile`,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const { data: prediction } = useSWR<TrafficPredictionResponse>(
    `/api/cameras/${id}/traffic/predict?hour=${selectedHour}`,
    fetcher,
  );

  if (error || currentError) {
    return (
      <ErrorState
        message="Kamera atau data lalu lintas belum dapat dimuat dari backend."
        onRetry={() => {
          mutateCamera();
          mutateCurrent();
        }}
      />
    );
  }

  if (!camera || !current) {
    return (
      <div
        role="status"
        className="rounded-lg border border-slate-200 bg-white p-8 text-center"
      >
        <p className="text-sm font-medium text-slate-900">
          Memuat data kamera dan telemetri...
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Menghubungkan ke layanan pemantauan lalu lintas.
        </p>
      </div>
    );
  }

  const vehicles = [
    ["Sepeda Motor", current.motorcycle_count, Bike],
    ["Mobil Pribadi", current.car_count, Car],
    ["Bus Angkutan", current.bus_count, Bus],
    ["Truk Logistik", current.truck_count, Truck],
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Link href="/cctv" className="hover:text-slate-900 transition-colors">
              Kamera CCTV
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 font-semibold">{cleanCameraName(camera.name)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {cleanCameraName(camera.name)}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {camera.road_name} · Pembaruan {dateTime(current.timestamp)}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <StatusBadge status={current.traffic_status} />
          <span className="text-slate-300" aria-hidden="true">|</span>
          <TrendView trend={current.trend} />
        </div>
      </div>

      {/* Primary Row: Video Stream + Compact Telemetry Panel */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_.75fr]">
        <div
          ref={videoContainerRef}
          className={`overflow-hidden rounded-lg border flex flex-col ${
            isFullscreen
              ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none justify-between bg-black"
              : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-2.5 shrink-0 ${
              isFullscreen
                ? "border-slate-800 text-white bg-slate-950"
                : "border-slate-200 text-slate-900 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full shrink-0 ${
                  streamError ? "bg-amber-500" : "bg-emerald-600"
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {streamError ? "Menghubungkan Ulang" : "Siaran Langsung"}
              </span>
              {isFullscreen && (
                <span className="hidden sm:inline-block text-xs text-slate-300 truncate">
                  · {cleanCameraName(camera.name)} ({camera.road_name})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {isFullscreen && (
                <div className="hidden sm:block">
                  <StatusBadge status={current.traffic_status} />
                </div>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isFullscreen
                    ? "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                }`}
                title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Mode Layar Penuh"}
              >
                {isFullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
                <span>{isFullscreen ? "Keluar" : "Layar Penuh"}</span>
              </button>
            </div>
          </div>

          <div
            className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${
              isFullscreen ? "flex-1 w-full h-full" : "aspect-video"
            }`}
            onDoubleClick={toggleFullscreen}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${getApiUrl()}/api/cameras/${camera.id}/stream/video?v=${streamKey}`}
              alt={`Live stream ${cleanCameraName(camera.name)}`}
              width={640}
              height={360}
              className={`h-full w-full ${isFullscreen ? "object-contain" : "object-cover"}`}
              onLoad={() => setStreamError(false)}
              onError={() => {
                setStreamError(true);
                setTimeout(() => setStreamKey((k: number) => k + 1), 1000);
              }}
            />

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
              className="absolute bottom-3 right-3 rounded-md border border-slate-200 bg-white/95 p-2 text-slate-700 hover:bg-white hover:text-blue-700 transition-colors shadow-sm"
              title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Layar Penuh"}
            >
              {isFullscreen ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            </button>
          </div>

          {isFullscreen && (
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-2.5 text-white flex items-center justify-between text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-5">
                <span>Motor: <b className="tabular">{current.motorcycle_count}</b></span>
                <span>Mobil: <b className="tabular">{current.car_count}</b></span>
                <span>Bus: <b className="tabular">{current.bus_count}</b></span>
                <span>Truk: <b className="tabular">{current.truck_count}</b></span>
                <span>
                  Total 5 Menit ({fiveMinuteWindowLabel(current.timestamp)}): <b className="text-emerald-400 tabular">{current.rolling_5_minute} kend ({current.vehicles_per_minute}/mnt)</b>
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300 text-[11px]">
                Tekan Esc atau klik dua kali untuk keluar
              </span>
            </div>
          )}
        </div>

        {/* Unified Operational Telemetry Panel */}
        <div className="rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">
                Volume Akumulasi (5 Menit)
              </span>
              <span className="font-mono text-[11px] font-medium text-slate-700 tabular">
                {fiveMinuteWindowLabel(current.timestamp)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <strong className="text-4xl font-bold tracking-tight text-slate-900 tabular">
                {current.rolling_5_minute}
              </strong>
              <span className="text-xs font-medium text-slate-600">kendaraan</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600">
              Rentang waktu: <span className="font-mono font-medium text-slate-800">{fiveMinuteWindowLabel(current.timestamp)}</span>
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span>
                Laju rata-rata:{" "}
                <strong className="font-semibold text-slate-900 tabular">
                  {current.vehicles_per_minute}
                </strong>{" "}
                kend./menit
              </span>
              <span>
                {camera.is_demo ? "Feed Demo" : "Diskominfo Palembang"}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {vehicles.map(([label, value, Icon]) => (
              <div
                key={label}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Icon size={16} aria-hidden="true" className="text-slate-500" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <strong className="text-lg font-bold text-slate-900 tabular">
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 24h Trend Chart & Mini Map */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Aktivitas Lalu Lintas (24 Jam Terakhir)
          </h2>

          {!history || history.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <EmptyState
                title="Belum Ada Riwayat 24 Jam"
                description="Snapshot lalu lintas untuk kamera ini belum terkumpul pada rentang 24 jam terakhir."
              />
            </div>
          ) : (
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value: string) => {
                      try {
                        const d = new Date(value);
                        return isNaN(d.getTime())
                          ? ""
                          : d.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                      } catch {
                        return "";
                      }
                    }}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) => dateTime(String(value))}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    dataKey="total_count"
                    name="Kendaraan"
                    type="monotone"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white flex flex-col">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Lokasi Kamera
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">{camera.road_name}</p>
          </div>
          <div className="h-64 w-full flex-1">
            <MapPanel
              cameras={[camera]}
              traffic={current ? [current] : []}
              showPotholeLayer={false}
              showRouteLayer={false}
              showLegend={false}
              initialCenter={[camera.latitude, camera.longitude]}
              initialZoom={15}
            />
          </div>
        </section>
      </div>

      {/* Historical Pattern & Time-Based Prediction (Flat, Un-nested) */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Pola Historis & Prediksi Kepadatan per Jam
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Pilih jam atau klik batang grafik untuk melihat perkiraan kepadatan berdasarkan data historis.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
            {profileData?.morning_peak && (
              <span>
                Puncak Pagi: <strong className="font-semibold text-slate-900">{profileData.morning_peak}</strong>
              </span>
            )}
            {profileData?.evening_peak && (
              <span>
                Puncak Sore: <strong className="font-semibold text-slate-900">{profileData.evening_peak}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="hour-slider" className="text-xs font-semibold text-slate-700">
                  Simulasi Jam
                </label>
                <span className="text-base font-bold font-mono text-blue-700 tabular">
                  {selectedHour.toString().padStart(2, "0")}:00 WIB
                </span>
              </div>

              <input
                id="hour-slider"
                type="range"
                min="0"
                max="23"
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
              />

              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {[
                  { label: "07:00", hour: 7 },
                  { label: "12:00", hour: 12 },
                  { label: "17:00", hour: 17 },
                  { label: "20:00", hour: 20 },
                ].map((preset) => (
                  <button
                    key={preset.hour}
                    type="button"
                    onClick={() => setSelectedHour(preset.hour)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                      selectedHour === preset.hour
                        ? "bg-blue-700 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {prediction && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Prediksi Status</span>
                  <StatusBadge status={prediction.predicted_status} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-600 block">Skor Kemacetan</span>
                    <span className="text-base font-bold text-slate-900 tabular">
                      {prediction.congestion_score.toFixed(1)} / 100
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-600 block">Perkiraan Volume</span>
                    <span className="text-base font-bold text-slate-900 tabular">
                      ~{prediction.avg_vehicles_per_minute} kend/mnt
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Kepercayaan: {prediction.confidence_level}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
                  {prediction.recommendation}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Rata-rata Volume per Jam (kend/menit)
              </span>
            </div>
            {!profileData?.profile?.length ? (
              <div className="flex h-56 items-center justify-center">
                <EmptyState
                  title="Profil Jam Belum Tersedia"
                  description="Data rata-rata kepadatan per jam belum tersedia untuk kamera ini."
                />
              </div>
            ) : (
              <div className="h-56 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profileData.profile}
                    margin={{ left: -24, right: 4, top: 8, bottom: 0 }}
                    onClick={(e: unknown) => {
                      const event = e as { activePayload?: Array<{ payload: HourlyProfileItem }> };
                      if (event?.activePayload?.[0]?.payload?.hour !== undefined) {
                        setSelectedHour(event.activePayload[0].payload.hour);
                      }
                    }}
                  >
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h: number) => `${h}`}
                      tick={{ fontSize: 10, fill: "#475569" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#475569" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val} kendaraan/mnt`, "Rata-rata"]}
                      labelFormatter={(h) => `Pukul ${String(h).padStart(2, "0")}:00 WIB`}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="avg_vehicles_per_minute" radius={[2, 2, 0, 0]}>
                      {profileData.profile.map((entry) => (
                        <Cell
                          key={`cell-${entry.hour}`}
                          cursor="pointer"
                          fill={
                            entry.hour === selectedHour
                              ? "#1d4ed8"
                              : entry.traffic_status === "MACET"
                              ? "#dc2626"
                              : entry.traffic_status === "PADAT"
                              ? "#ea580c"
                              : entry.traffic_status === "SEDANG"
                              ? "#d97706"
                              : "#16a34a"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-end gap-4 mt-2 text-[11px] text-slate-600 flex-wrap">
              <span>Hijau: Lancar</span>
              <span>Kuning: Sedang</span>
              <span>Oranye: Padat</span>
              <span>Merah: Macet</span>
              <span className="font-semibold text-blue-700">Biru: Jam dipilih ({selectedHour}:00)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
