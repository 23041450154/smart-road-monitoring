"use client";

import { ArrowRight, Camera as CameraIcon, MapPin, Plus, Radio } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { ErrorState, LoadingCards, PageHeading, StatusBadge } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import type { Camera, TrafficCurrent } from "@/lib/types";

export default function CctvPage() {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const { data: cameras, error, mutate } = useSWR<Camera[]>("/api/cameras", fetcher);
  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, {
    refreshInterval: 15_000,
  });

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
    <>
      <PageHeading
        eyebrow="Pemantauan Visual"
        title="Kamera CCTV Lalu Lintas"
        description="Jaringan kamera lalu lintas publik diolah menggunakan model deteksi kendaraan anonim — menghitung volume kendaraan tanpa menyimpan wajah atau nomor pelat."
        action={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAdding((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
            >
              <Plus size={14} />
              <span>Tambah CCTV</span>
            </button>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
            >
              <MapPin size={14} />
              <span>Lihat di Peta</span>
            </Link>
          </div>
        }
      />

      {adding && (
        <form
          onSubmit={submit}
          className="mb-6 grid gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-zinc-700">Nama Kamera</label>
            <input
              required
              name="name"
              placeholder="Contoh: CCTV Simpang Polda"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-zinc-700">Nama Jalan</label>
            <input
              required
              name="road_name"
              placeholder="Contoh: Jl. Jend. Sudirman"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Latitude</label>
            <input
              required
              name="latitude"
              type="number"
              step="any"
              defaultValue="-2.976"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Longitude</label>
            <input
              required
              name="longitude"
              type="number"
              step="any"
              defaultValue="104.748"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Tipe Stream</label>
            <select
              name="stream_type"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            >
              <option value="local">Local Video</option>
              <option value="hls">HLS Stream</option>
              <option value="rtsp">RTSP</option>
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-zinc-700">URL / Path Stream</label>
            <input
              name="stream_url"
              placeholder="Kosongkan bila menggunakan feed default"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 self-end py-2">
            <input
              type="checkbox"
              id="is_demo"
              name="is_demo"
              className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
            />
            <label htmlFor="is_demo" className="text-xs font-medium text-zinc-700 cursor-pointer">
              Tandai sebagai DEMO
            </label>
          </div>
          <div className="lg:col-span-2 flex items-end">
            <button className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors">
              Simpan Kamera
            </button>
          </div>
          {message && (
            <p className="text-xs text-rose-600 lg:col-span-6">{message}</p>
          )}
        </form>
      )}

      {error ? (
        <ErrorState />
      ) : !cameras ? (
        <LoadingCards count={3} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((camera) => {
            const current = traffic?.find((item) => item.camera_id === camera.id);
            return (
              <Link
                href={`/cctv/${camera.id}`}
                key={camera.id}
                className="group overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm flex flex-col"
              >
                {/* Video Placeholder Container */}
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-zinc-950">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                  <CameraIcon size={36} className="text-zinc-700" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    <Radio
                      size={10}
                      className={camera.is_active ? "text-emerald-400" : "text-zinc-500"}
                    />
                    {camera.is_active ? "ONLINE" : "OFFLINE"}
                  </span>
                  {camera.is_demo && (
                    <span className="absolute right-3 top-3 rounded-md border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
                      DEMO
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
                          {camera.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin size={12} className="shrink-0 text-zinc-400" />
                          <span>{camera.road_name}</span>
                        </p>
                      </div>
                      {current && <StatusBadge status={current.traffic_status} />}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                    <span className="text-zinc-500">
                      <b className="text-base font-semibold text-zinc-900 tabular">
                        {current?.vehicles_per_minute ?? 0}
                      </b>{" "}
                      kend./menit
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
                      Detail Feed
                      <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
