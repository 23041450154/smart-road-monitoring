"use client";

import { Construction, LogIn, MapPin, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Pothole } from "@/lib/types";
import { cn, dateTime } from "@/lib/utils";

const severityConfig: Record<string, { text: string; dot: string }> = {
  unknown: { text: "text-zinc-500", dot: "bg-zinc-400" },
  low: { text: "text-amber-600", dot: "bg-amber-500" },
  medium: { text: "text-orange-600", dot: "bg-orange-500" },
  high: { text: "text-rose-600", dot: "bg-rose-500" },
};

export default function PotholesPage() {
  const { role } = useAuth();
  const { data, error, mutate } = useSWR<Pothole[]>("/api/potholes", fetcher);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      await mutateApi<Pothole>("/api/potholes", "POST", {
        latitude: Number(values.get("latitude")),
        longitude: Number(values.get("longitude")),
        road_name: values.get("road_name") || null,
        confidence: Number(values.get("confidence")),
        severity: values.get("severity"),
        status: "unverified",
      });
      await mutate();
      setAdding(false);
      event.currentTarget.reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menambah titik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Inspeksi Permukaan Jalan"
        title="Deteksi Jalan Berlubang"
        description="Hasil deteksi cacat permukaan jalan berasal dari rekaman video manual bersensor GPS atau pelaporan terverifikasi. Pipeline kamera CCTV terpisah dari modul ini."
        action={
          role === "guest" ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
            >
              <LogIn size={13} />
              <span>Masuk untuk Input Titik</span>
            </Link>
          ) : (
            <button
              onClick={() => setAdding((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
            >
              <Plus size={14} />
              <span>Tambah Koordinat</span>
            </button>
          )
        }
      />

      {role !== "guest" && adding && (
        <form
          onSubmit={submit}
          className="mb-6 grid gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs sm:grid-cols-2 lg:grid-cols-6"
        >
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
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-zinc-700">Nama Jalan</label>
            <input
              name="road_name"
              placeholder="Contoh: Jl. Demang Lebar Daun (Opsional)"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Confidence</label>
            <input
              required
              name="confidence"
              type="number"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0.8"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Tingkat Keparahan</label>
            <select
              name="severity"
              defaultValue="unknown"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            >
              <option value="unknown">Belum terukur</option>
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>
          {message && (
            <p className="text-xs text-rose-600 lg:col-span-5">{message}</p>
          )}
          <div className="lg:col-start-6 flex items-end">
            <button
              disabled={saving}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <ErrorState />
      ) : !data ? (
        <div className="skeleton h-96 rounded-xl border border-zinc-200" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
          <div className="h-[360px] sm:h-[480px] xl:h-[600px] overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
            <MapPanel potholes={data} />
          </div>

          <div className="space-y-3">
            {!data.length ? (
              <EmptyState
                title="Tidak Ada Titik"
                description="Belum ada data jalan berlubang yang terverifikasi."
              />
            ) : (
              data.map((item) => {
                const conf = severityConfig[item.severity] ?? severityConfig.unknown;
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition hover:border-zinc-300"
                  >
                    <div className="flex items-start gap-3">
                      <Construction size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="truncate text-sm font-semibold text-zinc-900">
                            {item.road_name ?? "Lokasi Belum Bernama"}
                          </h2>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
                              conf.text,
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", conf.dot)} />
                            {item.severity}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin size={12} className="text-zinc-400" />
                          <span>
                            {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                          </span>
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-400">
                          <span>{dateTime(item.detected_at)}</span>
                          <span className="flex items-center gap-1 font-medium text-zinc-600">
                            <ShieldCheck size={13} className="text-emerald-600" />
                            <span>{Math.round(item.confidence * 100)}% confidence</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
