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
  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, { refreshInterval: 15_000 });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      await mutateApi("/api/cameras", "POST", {
        name: values.get("name"), road_name: values.get("road_name"),
        latitude: Number(values.get("latitude")), longitude: Number(values.get("longitude")),
        stream_type: values.get("stream_type"), stream_url: values.get("stream_url") || null,
        is_active: true, is_demo: values.get("is_demo") === "on",
        low_threshold: 20, medium_threshold: 45, high_threshold: 75,
      });
      await mutate(); setAdding(false); event.currentTarget.reset();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Gagal menambah kamera"); }
  }
  return <>
    <PageHeading eyebrow="Pemantauan visual" title="CCTV Lalu Lintas" description="Sumber video resmi atau lokal diolah menjadi hitungan kendaraan anonim—tanpa identifikasi wajah maupun pelat nomor." action={<div className="flex gap-2"><button onClick={() => setAdding(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-bold"><Plus size={15} /> Tambah CCTV</button><Link href="/map" className="inline-flex items-center gap-2 rounded-xl bg-[#102c27] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#1b4a40]"><MapPin size={15} /> Lihat di peta</Link></div>} />
    {adding && <form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-black/8 bg-[#fffef9] p-5 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-bold lg:col-span-2">Nama kamera<input required name="name" placeholder="CCTV Simpang…" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold lg:col-span-2">Nama jalan<input required name="road_name" placeholder="Jl. …" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Latitude<input required name="latitude" type="number" step="any" defaultValue="-2.976" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Longitude<input required name="longitude" type="number" step="any" defaultValue="104.748" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="text-xs font-bold">Tipe<select name="stream_type" className="mt-2 w-full rounded-xl border border-black/12 bg-white p-3"><option value="local">Local</option><option value="hls">HLS</option><option value="rtsp">RTSP</option></select></label><label className="text-xs font-bold lg:col-span-3">URL/path stream<input name="stream_url" placeholder="Kosongkan bila belum tersedia" className="mt-2 w-full rounded-xl border border-black/12 p-3" /></label><label className="flex items-center gap-2 self-end py-3 text-xs font-bold"><input type="checkbox" name="is_demo" /> Tandai data DEMO</label><button className="self-end rounded-xl bg-[#102c27] px-4 py-3 text-xs font-bold text-white">Simpan</button>{message && <p className="text-xs text-red-700 lg:col-span-6">{message}</p>}</form>}
    {error ? <ErrorState /> : !cameras ? <LoadingCards count={3} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cameras.map(camera => {
        const current = traffic?.find(item => item.camera_id === camera.id);
        return <Link href={`/cctv/${camera.id}`} key={camera.id} className="group overflow-hidden rounded-2xl border border-black/8 bg-[#fffef9] shadow-[0_10px_30px_rgba(16,32,29,.04)] transition hover:-translate-y-1 hover:shadow-xl">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[#173932]">
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <CameraIcon size={42} className="text-white/18" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur"><Radio size={10} className="text-[#c9f260]" /> {camera.is_active ? "ONLINE" : "OFFLINE"}</span>
            {camera.is_demo && <span className="absolute right-3 top-3 rounded-full bg-[#fff4bd] px-2.5 py-1 text-[9px] font-black text-[#695b1d]">DEMO</span>}
          </div>
          <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{camera.name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-[#64726e]"><MapPin size={12} />{camera.road_name}</p></div>{current && <StatusBadge status={current.traffic_status} />}</div>
            <div className="mt-5 flex items-center justify-between border-t border-black/7 pt-4 text-xs"><span><b className="text-lg">{current?.vehicles_per_minute ?? 0}</b> <span className="text-[#64726e]">kend./menit</span></span><ArrowRight size={17} className="transition group-hover:translate-x-1" /></div>
          </div>
        </Link>;
      })}
    </div>}
  </>;
}
