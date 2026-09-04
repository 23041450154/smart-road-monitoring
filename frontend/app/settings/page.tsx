import { Bell, Bot, Database, LockKeyhole, MonitorCog } from "lucide-react";
import { PageHeading } from "@/components/ui";

const settings = [
  { icon: Database, title: "PostgreSQL + PostGIS", note: "Geometri rute dan proximity query", value: "postgres:5432", state: "Docker service" },
  { icon: MonitorCog, title: "Sumber kamera", note: "Local video / HLS / RTSP terotorisasi", value: "CAMERA_SOURCE", state: "local (demo)" },
  { icon: Bell, title: "Jadwal perjalanan", note: "Dijalankan oleh n8n remote · Asia/Jakarta", value: "06:45 / 16:45", state: "remote schedule" },
  { icon: Bot, title: "WhatsApp", note: "Outbox siap; provider dan credential disambungkan nanti", value: "ready_to_send=false", state: "draft" },
];

export default function SettingsPage() {
  return <>
    <PageHeading eyebrow="Konfigurasi sistem" title="Pengaturan" description="Nilai sensitif dikelola lewat file .env dan credential store n8n, bukan melalui browser." />
    <div className="grid gap-4 md:grid-cols-2">{settings.map(item => <article key={item.title} className="rounded-2xl border border-black/8 bg-[#fffef9] p-5"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef0e8]"><item.icon size={19} /></span><div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-xs text-[#64726e]">{item.note}</p><code className="mt-4 inline-block rounded-lg bg-[#102c27] px-2.5 py-1.5 text-[10px] text-[#c9f260]">{item.value}</code><span className="ml-2 text-[10px] font-bold uppercase text-[#8a9591]">{item.state}</span></div></div></article>)}</div>
        <div className="mt-5 rounded-2xl border border-[#cedfa0] bg-[#eff8d8] p-5"><div className="flex gap-4"><LockKeyhole className="shrink-0 text-[#31552c]" /><div><h2 className="font-bold text-[#25451f]">Aturan integrasi CCTV</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#4e6649]">Hanya gunakan stream yang memang tersedia untuk publik dan diizinkan untuk dilihat. Sistem tidak memiliki mekanisme bypass autentikasi atau pencarian credential.</p><code className="mt-3 inline-block text-xs font-bold text-[#25451f]">docs/cctv-integration.md</code></div></div></div>
  </>;
}
