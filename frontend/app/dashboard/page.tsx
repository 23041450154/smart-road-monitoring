"use client";

import { Activity, Camera, Construction, RadioTower, Route } from "lucide-react";
import useSWR from "swr";
import { TrafficCharts } from "@/components/traffic-charts";
import { ErrorState, LoadingCards, PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Summary, TrafficCurrent } from "@/lib/types";
import { dateTime } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, error: summaryError } = useSWR<Summary>("/api/traffic/summary", fetcher, { refreshInterval: 30_000 });
  const { data: traffic, error: trafficError } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher, { refreshInterval: 15_000 });
  const cards = summary ? [
    ["CCTV online", summary.cctv_online, Camera, "Titik kamera aktif"],
    ["Kendaraan · 5 menit", summary.vehicles_last_5_minutes, Activity, "Agregat seluruh kamera"],
    ["Jalan padat", summary.congested_roads, Route, "Status PADAT / MACET"],
    ["Jalan berlubang", summary.detected_potholes, Construction, "Aktif dan belum diverifikasi"],
  ] as const : [];
  return <>
    <PageHeading eyebrow="Kondisi kota · sekarang" title="Selamat pagi, Palembang." description="Satu tampilan untuk membaca arus kendaraan, titik jalan berlubang, dan rute perjalanan harian." action={<div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold shadow-sm"><RadioTower size={14} className="text-emerald-600" /> Live · {summary ? dateTime(summary.generated_at) : "menghubungkan"}</div>} />
    {summaryError || trafficError ? <ErrorState /> : !summary || !traffic ? <LoadingCards /> : <>
      {summary.demo_mode && <div className="mb-5 rounded-xl border border-[#dac981] bg-[#fff4bd] px-4 py-3 text-xs font-semibold text-[#695b1d]">Mode demo aktif — seluruh angka di halaman ini adalah data simulasi, bukan lalu lintas aktual.</div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, note], i) => <article key={label} className="group rounded-2xl border border-black/8 bg-[#fffef9] p-5 shadow-[0_10px_30px_rgba(16,32,29,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,32,29,.08)]">
          <div className="mb-6 flex items-start justify-between"><span className="text-xs font-bold text-[#64726e]">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${i === 2 ? "bg-[#ff7849] text-white" : i === 0 ? "bg-[#c9f260]" : "bg-[#eef0e8]"}`}><Icon size={17} /></span></div>
          <strong className="display text-4xl">{value.toLocaleString("id-ID")}</strong><p className="mt-1 text-[11px] text-[#8a9591]">{note}</p>
        </article>)}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <TrafficCharts traffic={traffic} />
        <div className="rounded-2xl bg-[#102c27] p-5 text-white shadow-xl">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#c9f260]">Koridor terpantau</p><h2 className="mt-1 text-lg font-bold">Status per ruas jalan</h2></div><Activity size={20} className="text-white/35" /></div>
          <div className="space-y-2.5">{traffic.map(item => <div key={item.camera_id} className="rounded-xl border border-white/8 bg-white/[.045] p-3.5">
            <div className="flex items-start justify-between gap-2"><div><strong className="block text-sm">{item.road_name}</strong><span className="text-[10px] text-white/45">{item.camera_name}</span></div><StatusBadge status={item.traffic_status} /></div>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="text-white/55"><b className="text-white">{item.vehicles_per_minute}</b> kendaraan/menit</span><TrendView trend={item.trend} /></div>
          </div>)}</div>
        </div>
      </section>
    </>}
  </>;
}
