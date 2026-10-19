"use client";

import {
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Route as RouteIcon,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { PageHeading } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminStats, UpcomingBriefingItem, User } from "@/lib/types";

export default function AdminPage() {
  const { role } = useAuth();
  const { data: stats, mutate: mutateStats } = useSWR<AdminStats>("/api/admin/stats", fetcher);
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("/api/admin/users", fetcher);

  const filterAhead = 5;
  const [upcomingBriefings, setUpcomingBriefings] = useState<UpcomingBriefingItem[] | null>(null);
  const [loadingBriefings, setLoadingBriefings] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchUpcoming = async (forceAll: boolean = false) => {
    setLoadingBriefings(true);
    setNotificationMsg(null);
    try {
      const items = await fetcher<UpcomingBriefingItem[]>(
        `/api/notifications/upcoming-briefings?minutes_ahead=${filterAhead}&force_all=${forceAll}`
      );
      setUpcomingBriefings(items);
      if (items.length === 0) {
        setNotificationMsg("Tidak ada rute yang jatuh tempo dalam jendela waktu ini.");
      }
    } catch (err: unknown) {
      setNotificationMsg(err instanceof Error ? err.message : "Gagal memuat jadwal briefing");
    } finally {
      setLoadingBriefings(false);
    }
  };

  const toggleUserRole = async (targetUser: User) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    if (!confirm(`Ubah role ${targetUser.name} menjadi ${nextRole.toUpperCase()}?`)) return;

    setRoleUpdating(targetUser.id);
    try {
      await mutateApi<User>(`/api/admin/users/${targetUser.id}/role`, "PATCH", {
        role: nextRole,
      });
      mutateUsers();
      mutateStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui role");
    } finally {
      setRoleUpdating(null);
    }
  };

  if (role !== "admin") {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-100 text-rose-600 mb-3">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-lg font-bold text-zinc-900">Akses Dibatasi</h1>
        <p className="mt-1.5 text-xs text-zinc-500">
          Halaman ini khusus untuk pengguna dengan hak akses <strong>Administrator</strong>. Silakan masuk dengan akun admin Anda.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition"
        >
          Ke Halaman Login &rarr;
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Pusat Manajemen Administrator"
        title="Admin Panel & Bot Dispatcher"
        description="Kelola seluruh akun pengguna, awasi nomor WhatsApp terintegrasi, dan uji pengiriman briefing rute 5 menit sebelum keberangkatan."
      />

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Total Pengguna</span>
            <Users size={16} className="text-zinc-400" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.total_users ?? "—"}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">WhatsApp Terhubung</span>
            <MessageSquare size={16} className="text-emerald-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-emerald-600 block tabular">
            {stats?.users_with_whatsapp ?? "—"}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">Rute Tersimpan</span>
            <RouteIcon size={16} className="text-blue-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.total_routes ?? "—"}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium text-zinc-600">CCTV Aktif</span>
            <Camera size={16} className="text-purple-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.active_cameras ?? "—"}
          </strong>
        </div>
      </div>

      {/* WhatsApp Dispatcher & 5-Minute Lead Tester */}
      <section className="mb-8 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-emerald-200/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <Bot size={15} />
              </span>
              <h2 className="text-base font-bold text-zinc-900">
                Pengawas Notifikasi WhatsApp (5 Menit Sebelum Rute)
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              Uji pengambilan data rute oleh bot WhatsApp (n8n/worker) yang dijadwalkan dalam 5 menit ke depan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUpcoming(false)}
              disabled={loadingBriefings}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition"
            >
              <Clock size={13} />
              <span>Cek Rute Due (5 Menit)</span>
            </button>
            <button
              onClick={() => fetchUpcoming(true)}
              disabled={loadingBriefings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-800 shadow-xs hover:bg-emerald-50 disabled:opacity-50 transition"
            >
              <RefreshCw size={13} className={loadingBriefings ? "animate-spin" : ""} />
              <span>Simulasi Semua Rute</span>
            </button>
          </div>
        </div>

        {notificationMsg && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            {notificationMsg}
          </div>
        )}

        {upcomingBriefings && upcomingBriefings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
              {upcomingBriefings.length} Notifikasi WhatsApp Siap Dikirim:
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingBriefings.map((item) => (
                <article
                  key={`${item.route_id}-${item.user_id}`}
                  className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <strong className="block text-xs font-semibold text-zinc-900">
                        {item.user_name}
                      </strong>
                      <span className="text-[11px] font-mono text-emerald-700 font-medium">
                        📱 {item.phone_number}
                      </span>
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Jadwal: {item.scheduled_time} WIB
                    </span>
                  </div>

                  <div className="mb-3 text-[11px] text-zinc-500">
                    Rute: <strong className="text-zinc-800">{item.route_name}</strong> · Status:{" "}
                    <span className="font-semibold text-zinc-700">{item.overall_status}</span>
                  </div>

                  {/* WhatsApp Preview Bubble */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 font-sans whitespace-pre-line leading-relaxed shadow-inner">
                    {item.message}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 pt-2">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 size={12} />
                      Format Bot WhatsApp Valid
                    </span>
                    <span className="text-zinc-400">Advance: {item.notification_lead_minutes} mnt</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* User Management Table */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Daftar Pengguna Sistem</h2>
            <p className="text-xs text-zinc-500">
              Kelola akun terdaftar, verifikasi nomor WhatsApp, dan konfigurasikan role.
            </p>
          </div>
          <button
            onClick={() => mutateUsers()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Nama</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">WhatsApp</th>
                <th className="py-3 px-3">Lead Notif</th>
                <th className="py-3 px-3">Rute</th>
                <th className="py-3 px-3 text-right">Aksi Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-zinc-900">{u.name}</td>
                  <td className="py-3 px-3 text-zinc-600">{u.email}</td>
                  <td className="py-3 px-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        <ShieldCheck size={11} />
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                        <UserCheck size={11} />
                        USER
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {u.phone_number ? (
                      <span className="font-mono text-emerald-700 font-medium">
                        {u.phone_number}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">Belum diatur</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-zinc-600">
                    {u.notification_lead_minutes} menit
                  </td>
                  <td className="py-3 px-3 font-semibold text-zinc-900">
                    {u.routes_count ?? 0}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => toggleUserRole(u)}
                      disabled={roleUpdating === u.id}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
                    >
                      {roleUpdating === u.id
                        ? "..."
                        : u.role === "admin"
                        ? "Jadikan User"
                        : "Jadikan Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
