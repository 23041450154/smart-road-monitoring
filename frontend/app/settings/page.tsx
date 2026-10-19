"use client";

import {
  Bell,
  Bot,
  CheckCircle2,
  Database,
  LockKeyhole,
  MessageSquare,
  MonitorCog,
  Phone,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RoleGate } from "@/components/role-gate";
import { PageHeading } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

const systemSpecs = [
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
    note: "Dikelola oleh worker n8n & scheduler internal · Asia/Jakarta",
    value: "5 mnt sebelum rute",
    state: "Active Schedule",
  },
  {
    icon: Bot,
    title: "Integrasi WhatsApp Notification",
    note: "Endpoint dispatch siap untuk bot WA eksternal / n8n outbox",
    value: "READY (5-min lead)",
    state: "Operational",
  },
];

function WhatsAppPreferencesForm({
  user,
  onSave,
}: {
  user: User;
  onSave: (data: {
    phone_number: string;
    notification_lead_minutes: number;
    wa_notifications_enabled: boolean;
  }) => Promise<void>;
}) {
  const [phone, setPhone] = useState(user.phone_number ?? "");
  const [leadMinutes, setLeadMinutes] = useState(user.notification_lead_minutes ?? 5);
  const [waEnabled, setWaEnabled] = useState(user.wa_notifications_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await onSave({
        phone_number: phone,
        notification_lead_minutes: Number(leadMinutes),
        wa_notifications_enabled: waEnabled,
      });
      setMessage("Preferensi notifikasi WhatsApp berhasil diperbarui!");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan preferensi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
            <MessageSquare size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              Integrasi Notifikasi WhatsApp Pengguna
            </h2>
            <p className="text-[11px] text-zinc-500">
              Konfigurasikan nomor WA dan advance lead time pengiriman informasi rute
            </p>
          </div>
        </div>
        <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold border border-emerald-200/60">
          Role: {user.role.toUpperCase()}
        </span>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Nomor WhatsApp Aktif
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 grid w-10 place-items-center text-zinc-400">
                <Phone size={14} />
              </span>
              <input
                type="tel"
                required
                placeholder="Mis. 08123456789 atau 628123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-400">
              Format lokal (08...) akan dinormalisasi otomatis ke standar internasional (628...).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Waktu Pengingat Sebelum Rute (Lead Time)
            </label>
            <select
              value={leadMinutes}
              onChange={(e) => setLeadMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
            >
              <option value={5}>5 Menit Sebelum Berangkat (Rekomendasi)</option>
              <option value={10}>10 Menit Sebelum Berangkat</option>
              <option value={15}>15 Menit Sebelum Berangkat</option>
              <option value={30}>30 Menit Sebelum Berangkat</option>
            </select>
            <p className="mt-1 text-[10px] text-zinc-400">
              Bot WA akan mengirimkan update kondisi kemacetan & lubang jalan pada jendela waktu ini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="waToggle"
            checked={waEnabled}
            onChange={(e) => setWaEnabled(e.target.checked)}
            className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="waToggle" className="text-xs font-medium text-zinc-700 cursor-pointer">
            Aktifkan pengiriman otomatis notifikasi rute harian via WhatsApp
          </label>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save size={13} />
            <span>{saving ? "Menyimpan..." : "Simpan Preferensi WhatsApp"}</span>
          </button>

          <Link
            href="/routes"
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Uji Notifikasi pada Rute &rarr;
          </Link>
        </div>
      </form>
    </section>
  );
}

function SettingsContent() {
  const { user, updateProfile } = useAuth();
  if (!user) return null;

  return (
    <>
      <PageHeading
        eyebrow="Preferensi & Pipeline"
        title="Pengaturan Sistem & WhatsApp"
        description="Kelola akun, konfigurasi nomor tujuan bot WhatsApp untuk notifikasi rute 5 menit sebelum berangkat, serta parameter sistem."
      />

      {/* User & WhatsApp Profile Card */}
      <WhatsAppPreferencesForm
        key={user.id}
        user={user}
        onSave={async (data) => {
          await updateProfile(data);
        }}
      />

      {/* System Architecture Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {systemSpecs.map((item) => (
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
              Kebijakan Feed CCTV & Privasi Komunikasi
            </h2>
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-zinc-600">
              Sistem LAJU mematuhi privasi pengguna dan etika pemantauan lalu lintas. Nomor WhatsApp hanya digunakan untuk mengirimkan peringatan kondisi rute sesuai izin pengguna, dan tidak dibagikan ke pihak ketiga. Pemrosesan video CCTV dilakukan secara anonim tanpa menyimpan identitas wajah atau plat kendaraan.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <RoleGate
      allowedRoles={["user", "admin"]}
      featureName="Pengaturan Akun & WhatsApp"
    >
      <SettingsContent />
    </RoleGate>
  );
}
