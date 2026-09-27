"use client";

import { RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutateApi } from "@/lib/api";
import type { Route } from "@/lib/types";
import { MapPanel } from "./map-panel";

export function RouteEditor({
  route,
  onCancel,
}: {
  route?: Route;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(route?.name ?? "Rute Berangkat");
  const [routeType, setRouteType] = useState<Route["route_type"]>(
    route?.route_type ?? "commute_to_work",
  );
  const [notifyTime, setNotifyTime] = useState(
    route?.notification_time?.slice(0, 5) ?? "06:45",
  );
  const [path, setPath] = useState<[number, number][]>(route?.path ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (path.length < 2) {
      return setError("Klik minimal dua titik pada peta: titik awal dan titik tujuan.");
    }
    setSaving(true);
    setError("");
    const body = {
      user_id: route?.user_id ?? 1,
      name,
      route_type: routeType,
      start_latitude: path[0][0],
      start_longitude: path[0][1],
      destination_latitude: path.at(-1)![0],
      destination_longitude: path.at(-1)![1],
      path,
      notification_time: notifyTime || null,
      is_active: true,
    };
    try {
      const saved = await mutateApi<Route>(
        route ? `/api/routes/${route.id}` : "/api/routes",
        route ? "PUT" : "POST",
        body,
      );
      router.push(`/routes/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan rute");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
      <div className="grid lg:grid-cols-[340px_1fr]">
        <div className="border-b border-zinc-100 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              {route ? "Edit Rute" : "Konfigurasi Rute Baru"}
            </span>
          </div>

          <label className="mb-3 block">
            <span className="text-xs font-medium text-zinc-700">Nama Rute</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </label>

          <label className="mb-3 block">
            <span className="text-xs font-medium text-zinc-700">Jenis Perjalanan</span>
            <select
              value={routeType}
              onChange={(e) =>
                setRouteType(e.target.value as Route["route_type"])
              }
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            >
              <option value="commute_to_work">Rute Berangkat</option>
              <option value="commute_home">Rute Pulang</option>
              <option value="custom">Rute Kustom</option>
            </select>
          </label>

          <label className="mb-4 block">
            <span className="text-xs font-medium text-zinc-700">Waktu Notifikasi</span>
            <input
              type="time"
              value={notifyTime}
              onChange={(e) => setNotifyTime(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            />
          </label>

          <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/70 p-3 text-xs leading-relaxed text-zinc-600">
            <strong className="text-zinc-900 block mb-1">Instruksi Menggambar:</strong>
            Klik titik awal pada peta, klik titik-titik lanjutan mengikuti jalan, lalu klik titik tujuan.
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={() => setPath((value) => value.slice(0, -1))}
              disabled={!path.length}
              className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 disabled:opacity-30 transition"
              title="Batalkan titik terakhir"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={() => setPath([])}
              disabled={!path.length}
              className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 disabled:opacity-30 transition"
              title="Hapus semua titik"
            >
              <Trash2 size={14} />
            </button>
            <span className="ml-auto text-xs font-medium text-zinc-500 tabular">
              {path.length} titik koordinat
            </span>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-200/80 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition"
            >
              <Save size={14} />
              <span>{saving ? "Menyimpan…" : "Simpan Rute"}</span>
            </button>
          </div>
        </div>

        <div className="h-[520px]">
          <MapPanel
            draftPath={path}
            onMapClick={(point) => setPath((value) => [...value, point])}
          />
        </div>
      </div>
    </div>
  );
}
