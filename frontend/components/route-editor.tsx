"use client";

import { RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutateApi } from "@/lib/api";
import type { Route } from "@/lib/types";
import { MapPanel } from "./map-panel";

export function RouteEditor({ route, onCancel }: { route?: Route; onCancel?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(route?.name ?? "Rute Berangkat");
  const [routeType, setRouteType] = useState<Route["route_type"]>(route?.route_type ?? "commute_to_work");
  const [notifyTime, setNotifyTime] = useState(route?.notification_time?.slice(0, 5) ?? "06:45");
  const [path, setPath] = useState<[number, number][]>(route?.path ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (path.length < 2) return setError("Klik minimal dua titik pada peta: awal dan tujuan.");
    setSaving(true); setError("");
    const body = {
      user_id: route?.user_id ?? 1, name, route_type: routeType,
      start_latitude: path[0][0], start_longitude: path[0][1],
      destination_latitude: path.at(-1)![0], destination_longitude: path.at(-1)![1],
      path, notification_time: notifyTime || null, is_active: true,
    };
    try {
      const saved = await mutateApi<Route>(route ? `/api/routes/${route.id}` : "/api/routes", route ? "PUT" : "POST", body);
      router.push(`/routes/${saved.id}`); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan rute"); }
    finally { setSaving(false); }
  }

  return <div className="overflow-hidden rounded-3xl border border-black/8 bg-[#fffef9] shadow-xl">
    <div className="grid lg:grid-cols-[330px_1fr]">
      <div className="border-b border-black/8 p-5 lg:border-b-0 lg:border-r">
        <p className="mb-5 text-[10px] font-black uppercase tracking-[.2em] text-[#df5b31]">{route ? "Edit rute" : "Rute baru"}</p>
        <label className="mb-4 block text-xs font-bold">Nama rute<input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-black/12 bg-white px-3 py-3 text-sm outline-none focus:border-[#123c33]" /></label>
        <label className="mb-4 block text-xs font-bold">Jenis perjalanan<select value={routeType} onChange={e => setRouteType(e.target.value as Route["route_type"])} className="mt-2 w-full rounded-xl border border-black/12 bg-white px-3 py-3 text-sm outline-none"><option value="commute_to_work">Rute Berangkat</option><option value="commute_home">Rute Pulang</option><option value="custom">Rute Kustom</option></select></label>
        <label className="mb-5 block text-xs font-bold">Waktu notifikasi<input type="time" value={notifyTime} onChange={e => setNotifyTime(e.target.value)} className="mt-2 w-full rounded-xl border border-black/12 bg-white px-3 py-3 text-sm outline-none" /></label>
        <div className="rounded-xl bg-[#eef0e8] p-3 text-xs leading-relaxed text-[#56635f]"><b className="text-[#10201d]">Cara menggambar</b><br />Klik lokasi awal, tambahkan titik mengikuti jalan, lalu klik tujuan. Urutan titik dapat dibatalkan satu per satu.</div>
        <div className="mt-4 flex gap-2"><button onClick={() => setPath(value => value.slice(0, -1))} disabled={!path.length} className="grid size-10 place-items-center rounded-xl border border-black/10 disabled:opacity-30" title="Batalkan titik"><Undo2 size={16} /></button><button onClick={() => setPath([])} disabled={!path.length} className="grid size-10 place-items-center rounded-xl border border-black/10 disabled:opacity-30" title="Hapus semua"><Trash2 size={16} /></button><span className="ml-auto self-center text-xs font-bold">{path.length} titik</span></div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
        <div className="mt-5 flex gap-2">{onCancel && <button onClick={onCancel} className="rounded-xl border border-black/10 px-4 py-3 text-xs font-bold"><RotateCcw size={14} /></button>}<button onClick={save} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#102c27] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#1b4a40] disabled:opacity-50"><Save size={15} />{saving ? "Menyimpan…" : "Simpan rute"}</button></div>
      </div>
      <div className="h-[550px]"><MapPanel draftPath={path} onMapClick={point => setPath(value => [...value, point])} /></div>
    </div>
  </div>;
}
