import { Bell, Bot, Database, LockKeyhole, MonitorCog } from "lucide-react";
import { PageHeading } from "@/components/ui";

const settings = [
  {
    icon: Database,
    title: "PostgreSQL + PostGIS",
    note: "Penyimpanan geometri rute spasial dan proximity query",
    value: "postgres:5432",
    state: "Docker Service",
  },
  {
    icon: MonitorCog,
    title: "Sumber Ingestion Kamera",
    note: "Local video / HLS / RTSP terotorisasi",
    value: "CAMERA_SOURCE",
    state: "Local (Demo)",
  },
  {
    icon: Bell,
    title: "Jadwal Briefing Perjalanan",
    note: "Dikelola oleh remote worker n8n · Zona Asia/Jakarta",
    value: "06:45 / 16:45",
    state: "Remote Schedule",
  },
  {
    icon: Bot,
    title: "Integrasi WhatsApp Notification",
    note: "Outbox messaging siap; credential provider eksternal",
    value: "ready_to_send=false",
    state: "Draft Mode",
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Konfigurasi Backend & Pipeline"
        title="Pengaturan Sistem"
        description="Nilai kredensial dan parameter sensitif diisolasi pada file environment (.env) dan secret store worker, bukan melalui form input browser."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                <item.icon size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900">{item.title}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{item.note}</p>
                <div className="mt-3.5 flex items-center gap-2">
                  <code className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-800 border border-zinc-200/60">
                    {item.value}
                  </code>
                  <span className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    {item.state}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200/70 bg-blue-50/50 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <LockKeyhole size={18} className="shrink-0 text-blue-600 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Kebijakan Integrasi Feed CCTV
            </h2>
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-zinc-600">
              Sistem LAJU dirancang mematuhi etika pengawasan publik. Pemrosesan visual hanya menerima stream video yang dibuka secara sah oleh instansi terkait. Seluruh proses inferensi dilakukan tanpa menyimpan rekaman data pribadi wajah atau plat nomor.
            </p>
            <code className="mt-2.5 inline-block text-xs font-mono font-medium text-blue-700">
              docs/cctv-integration.md
            </code>
          </div>
        </div>
      </div>
    </>
  );
}
