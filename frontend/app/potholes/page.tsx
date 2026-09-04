"use client";

import { Construction, MapPin, Plus, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import type { Pothole } from "@/lib/types";
import { cn, dateTime } from "@/lib/utils";

const severityStyle = { low: "bg-amber-100 text-amber-800", medium: "bg-orange-100 text-orange-800", high: "bg-red-100 text-red-800" };

export default function PotholesPage() {
  const { data, error, mutate } = useSWR<Pothole[]>("/api/potholes", fetcher);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      await mutateApi<Pothole>("/api/potholes", "POST", { latitude: Number(values.get("latitude")), longitude: Number(values.get("longitude")), road_name: values.get("road_name") || null, confidence: Number(values.get("confidence")), severity: values.get("severity"), status: "unverified" });
      await mutate(); setAdding(false); event.currentTarget.reset();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Gagal menambah titik"); }
    finally { setSaving(false); }
  }
  return <>
    <PageHeading eyebrow="Rekaman jalan manual" title="Jalan Berlubang" description="Titik pada modul ini hanya berasal dari rekaman manual + GPS atau input terverifikasi. CCTV tidak dipakai untuk deteksi lubang." action={<button onClick={() => setAdding(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#ff7849] px-4 py-3 text-xs font-bold text-white"><Plus size={15} /> Tambah koordinat</button>} />
    {adding && <form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-black/8 bg-[#fffef9] p-5 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-bold">Latitude<input required name="latitude" type="number" step="any" defaultValue="-2.976" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Longitude<input required name="longitude" type="number" step="any" defaultValue="104.748" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold lg:col-span-2">Nama jalan<input name="road_name" placeholder="Opsional" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Confidence<input required name="confidence" type="number" min="0" max="1" step="0.01" defaultValue="0.8" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Keparahan<select name="severity" defaultValue="medium" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select></label>{message && <p className="text-xs text-red-700 lg:col-span-5">{message}</p>}<button disabled={saving} className="rounded-xl bg-[#102c27] px-4 py-3 text-xs font-bold text-white lg:col-start-6">{saving ? "Menyimpan…" : "Simpan"}</button></form>}
    {error ? <ErrorState /> : !data ? <div className="skeleton h-96 rounded-2xl" /> : <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]"><div className="h-[600px] overflow-hidden rounded-2xl border border-black/8"><MapPanel potholes={data} /></div><div className="space-y-3">{!data.length ? <EmptyState title="Tidak ada titik" description="Belum ada jalan berlubang yang terdata." /> : data.map(item => <article key={item.id} className="rounded-2xl border border-black/8 bg-[#fffef9] p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0ea] text-[#df5b31]"><Construction size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="truncate text-sm font-bold">{item.road_name ?? "Lokasi belum bernama"}</h2><span className={cn("rounded-full px-2.5 py-1 text-[9px] font-black uppercase", severityStyle[item.severity])}>{item.severity}</span></div><p className="mt-1 flex items-center gap-1 text-[11px] text-[#64726e]"><MapPin size={11} />{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</p><div className="mt-3 flex items-center justify-between border-t border-black/7 pt-3 text-[10px] text-[#64726e]"><span>{dateTime(item.detected_at)}</span><span className="flex items-center gap-1"><ShieldCheck size={12} /> {Math.round(item.confidence * 100)}% confidence</span></div></div></div></article>)}</div></div>}
  </>;
}
