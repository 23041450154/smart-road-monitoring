"use client";

import {
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { PageHeading } from "@/components/ui";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminStats, UpcomingBriefingItem, User } from "@/lib/types";
import { cn, dateTime } from "@/lib/utils";

export default function AdminPage() {
  const { user: currentUser, role } = useAuth();
  const { data: stats, mutate: mutateStats } = useSWR<AdminStats>("/api/admin/stats", fetcher);
  const { data: users, mutate: mutateUsers } = useSWR<User[]>("/api/admin/users", fetcher);

  const filterAhead = 5;
  const [upcomingBriefings, setUpcomingBriefings] = useState<UpcomingBriefingItem[] | null>(null);
  const [loadingBriefings, setLoadingBriefings] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");

  // Modals State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"user" | "admin">("user");
  const [createPhone, setCreatePhone] = useState("");
  const [createLeadMinutes, setCreateLeadMinutes] = useState(5);
  const [createIsVerified, setCreateIsVerified] = useState(true);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editPhone, setEditPhone] = useState("");
  const [editWaEnabled, setEditWaEnabled] = useState(true);
  const [editLeadMinutes, setEditLeadMinutes] = useState(5);
  const [editIsVerified, setEditIsVerified] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);

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
    if (targetUser.id === currentUser?.id) {
      alert("Anda tidak dapat mengubah role akun Administrator Anda sendiri.");
      return;
    }
    if (!confirm(`Ubah role ${targetUser.name} menjadi ${nextRole.toUpperCase()}?`)) return;

    setRoleUpdating(targetUser.id);
    try {
      await mutateApi<User>(`/api/admin/users/${targetUser.id}/role`, "PATCH", {
        role: nextRole,
      });
      await mutateUsers();
      await mutateStats();
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui role");
    } finally {
      setRoleUpdating(null);
    }
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("user");
    setCreatePhone("");
    setCreateLeadMinutes(5);
    setCreateIsVerified(true);
    setShowCreatePassword(false);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    try {
      await mutateApi<User>("/api/admin/users", "POST", {
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
        phone_number: createPhone || null,
        wa_notifications_enabled: Boolean(createPhone),
        notification_lead_minutes: createLeadMinutes,
        is_verified: createIsVerified,
      });
      await mutateUsers();
      await mutateStats();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat pengguna baru");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email || "");
    setEditPassword("");
    setEditRole(targetUser.role);
    setEditPhone(targetUser.phone_number || "");
    setEditWaEnabled(targetUser.wa_notifications_enabled);
    setEditLeadMinutes(targetUser.notification_lead_minutes);
    setEditIsVerified(targetUser.is_verified ?? true);
    setShowEditPassword(false);
    setFormError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);
    setActionLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
        phone_number: editPhone || null,
        wa_notifications_enabled: editWaEnabled,
        notification_lead_minutes: editLeadMinutes,
        is_verified: editIsVerified,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const updated = await mutateApi<User>(`/api/admin/users/${editingUser.id}`, "PUT", payload);
      await mutateUsers();
      await mutateStats();
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser(updated);
      }
      setEditingUser(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal memperbarui pengguna");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert("Anda tidak dapat menghapus akun Administrator Anda sendiri.");
      return;
    }
    if (
      !confirm(
        `Hapus permanen akun ${targetUser.name} (${targetUser.email})? Seluruh data rute tersimpan miliknya juga akan dihapus.`
      )
    ) {
      return;
    }

    try {
      await mutateApi(`/api/admin/users/${targetUser.id}`, "DELETE");
      await mutateUsers();
      await mutateStats();
      if (selectedUser?.id === targetUser.id) setSelectedUser(null);
      if (editingUser?.id === targetUser.id) setEditingUser(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pengguna");
    }
  };

  const handleToggleVerification = async (targetUser: User) => {
    try {
      const nextVerified = !targetUser.is_verified;
      const updated = await mutateApi<User>(`/api/admin/users/${targetUser.id}`, "PUT", {
        is_verified: nextVerified,
      });
      await mutateUsers();
      await mutateStats();
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(updated);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status verifikasi");
    }
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (verificationFilter === "verified" && !u.is_verified) return false;
      if (verificationFilter === "unverified" && u.is_verified) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
        const phoneMatch = u.phone_number ? u.phone_number.includes(q) : false;
        if (!nameMatch && !emailMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, verificationFilter, searchQuery]);

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
        title="Admin Panel & Pengawasan Pengguna"
        description="Kelola akun pengguna terdaftar (tambah, edit, hapus, reset password), periksa status verifikasi, dan pantau pengiriman bot WhatsApp."
      />

      {/* Metrics Grid (5 Bento Cards) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Total Pengguna
            </span>
            <Users size={16} className="text-zinc-400" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.total_users ?? "—"}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Semua akun terdaftar
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-700">
              Terverifikasi
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-emerald-600 block tabular">
            {stats?.verified_users ?? stats?.total_users ?? "—"}
          </strong>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">
            Email & OTP tervalidasi
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              WhatsApp Aktif
            </span>
            <MessageSquare size={16} className="text-emerald-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.users_with_whatsapp ?? "—"}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Notifikasi rute aktif
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Rute Tersimpan
            </span>
            <RouteIcon size={16} className="text-blue-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.total_routes ?? "—"}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Rute personal warga
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              CCTV Aktif
            </span>
            <Camera size={16} className="text-purple-500" />
          </div>
          <strong className="text-2xl font-bold tracking-tight text-zinc-900 block tabular">
            {stats?.active_cameras ?? "—"}
          </strong>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Kamera streaming aktif
          </span>
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
              Uji pengambilan data rute oleh bot WhatsApp yang dijadwalkan dalam 5 menit ke depan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUpcoming(false)}
              disabled={loadingBriefings}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition cursor-pointer"
            >
              <Clock size={13} />
              <span>Cek Rute Due (5 Menit)</span>
            </button>
            <button
              onClick={() => fetchUpcoming(true)}
              disabled={loadingBriefings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-800 shadow-xs hover:bg-emerald-50 disabled:opacity-50 transition cursor-pointer"
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

      {/* User Management Section */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900">Manajemen Pengguna</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 border border-zinc-200">
                {users ? `${filteredUsers.length} dari ${users.length} Akun` : "..."}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tambah, edit data akun, reset password, verifikasi email, serta kelola hak akses Administrator.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 transition cursor-pointer"
            >
              <UserPlus size={13} />
              <span>Tambah Pengguna</span>
            </button>
            <button
              onClick={() => {
                mutateUsers();
                mutateStats();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau nomor HP..."
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs text-zinc-600 gap-0.5">
              {(["all", "user", "admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer capitalize",
                    roleFilter === r
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  {r === "all" ? "Semua Role" : r}
                </button>
              ))}
            </div>

            {/* Verification Filter */}
            <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs text-zinc-600 gap-0.5">
              {(["all", "verified", "unverified"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVerificationFilter(v)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer",
                    verificationFilter === v
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  {v === "all" ? "Semua Status" : v === "verified" ? "Terverifikasi" : "Belum"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 font-semibold">Pengguna</th>
                <th className="py-3 px-3.5 font-semibold">Email & Verifikasi</th>
                <th className="py-3 px-3.5 font-semibold">Role</th>
                <th className="py-3 px-3.5 font-semibold">WhatsApp & Notifikasi</th>
                <th className="py-3 px-3.5 font-semibold">Rute</th>
                <th className="py-3 px-3.5 font-semibold text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.name
                    ? u.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "U";
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/70 transition">
                      {/* Name & Avatar */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 font-semibold text-zinc-700 text-xs border border-zinc-200/60">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900 block truncate">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[9px] font-medium text-zinc-600 border border-zinc-200">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              ID: #{u.id} · {dateTime(u.created_at)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email & Verification */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1">
                          <span className="text-zinc-700 block truncate font-mono text-[11px]">
                            {u.email || "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleVerification(u)}
                            title="Klik untuk beralih status verifikasi"
                            className="cursor-pointer"
                          >
                            {u.is_verified ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition">
                                <CheckCircle2 size={10} />
                                Terverifikasi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition">
                                <Clock size={10} />
                                Belum Verifikasi (Klik untuk Setujui)
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3.5">
                        {u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
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

                      {/* WhatsApp */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          {u.phone_number ? (
                            <span className="font-mono text-zinc-800 font-medium block">
                              {u.phone_number}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic block">Belum diatur</span>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  u.wa_notifications_enabled && u.phone_number
                                    ? "bg-emerald-500"
                                    : "bg-zinc-300"
                                )}
                              />
                              {u.wa_notifications_enabled && u.phone_number
                                ? "Notifikasi Aktif"
                                : "Nonaktif"}
                            </span>
                            <span>•</span>
                            <span>Lead: {u.notification_lead_minutes}m</span>
                          </div>
                        </div>
                      </td>

                      {/* Routes count */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 border border-zinc-200 font-mono">
                          <RouteIcon size={11} className="text-zinc-500" />
                          {u.routes_count ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Detail */}
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs"
                            title="Lihat Detail Profil"
                          >
                            <Eye size={12} />
                            <span>Detail</span>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs"
                            title="Edit Data Pengguna"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition shadow-2xs cursor-pointer",
                              isCurrent
                                ? "border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed"
                                : "border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                            )}
                            title={isCurrent ? "Tidak dapat menghapus akun sendiri" : "Hapus Pengguna"}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: Detail Pengguna */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-2xs">
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900">{selectedUser.name}</h3>
                    {selectedUser.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        <ShieldCheck size={11} />
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                        <UserCheck size={11} />
                        USER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">ID Pengguna: #{selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    <Mail size={11} />
                    <span>Email & Verifikasi</span>
                  </div>
                  <div className="mt-1 font-medium text-zinc-900 break-all text-xs">
                    {selectedUser.email || "—"}
                  </div>
                  <div className="mt-1.5">
                    {selectedUser.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                        <CheckCircle2 size={10} /> Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                        <Clock size={10} /> Belum Terverifikasi
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    <Phone size={11} />
                    <span>Nomor WhatsApp</span>
                  </div>
                  <div className="mt-1 font-mono font-medium text-zinc-900 text-xs">
                    {selectedUser.phone_number || "Belum diatur"}
                  </div>
                  <div className="mt-1.5">
                    {selectedUser.wa_notifications_enabled && selectedUser.phone_number ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                        <span className="size-1 rounded-full bg-emerald-500" /> Notifikasi Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        Notifikasi Nonaktif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium block">
                    Lead Notifikasi
                  </span>
                  <span className="mt-1 font-bold text-zinc-900 block font-mono text-sm">
                    {selectedUser.notification_lead_minutes} mnt
                  </span>
                  <span className="text-[10px] text-zinc-400">Sebelum rute</span>
                </div>

                <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium block">
                    Rute Aktif
                  </span>
                  <span className="mt-1 font-bold text-zinc-900 block font-mono text-sm">
                    {selectedUser.routes_count ?? 0}
                  </span>
                  <span className="text-[10px] text-zinc-400">Jalur disimpan</span>
                </div>

                <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium block">
                    Zona Waktu
                  </span>
                  <span className="mt-1 font-medium text-zinc-800 block truncate text-xs">
                    {selectedUser.timezone}
                  </span>
                  <span className="text-[10px] text-zinc-400">WIB / GMT+7</span>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-200/60">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium block">
                  Tanggal Registrasi Akun
                </span>
                <span className="mt-0.5 font-mono text-zinc-800 block text-xs">
                  {dateTime(selectedUser.created_at)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const u = selectedUser;
                    setSelectedUser(null);
                    openEditModal(u);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
                >
                  <Pencil size={12} />
                  <span>Edit Data</span>
                </button>

                <button
                  onClick={() => {
                    const u = selectedUser;
                    toggleUserRole(u);
                  }}
                  disabled={roleUpdating === selectedUser.id || selectedUser.id === currentUser?.id}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition cursor-pointer disabled:opacity-50"
                >
                  {selectedUser.role === "admin" ? "Jadikan User Biasa" : "Jadikan Admin"}
                </button>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Pengguna Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <UserPlus size={16} />
                  Tambah Pengguna Baru
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Daftarkan akun baru ke dalam sistem Palembang Smart Mobility.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Nama lengkap pengguna"
                  className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-8.5 rounded-lg border border-zinc-200 pl-3 pr-8 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Role Akun</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as "user" | "admin")}
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-2.5 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none bg-white"
                  >
                    <option value="user">User Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Lead Notif (Menit)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={createLeadMinutes}
                    onChange={(e) => setCreateLeadMinutes(Number(e.target.value))}
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createIsVerified}
                      onChange={(e) => setCreateIsVerified(e.target.checked)}
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-700 font-medium">Status Terverifikasi</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {actionLoading ? "Menyimpan..." : "Tambah Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Pencil size={15} />
                  Edit Pengguna: {editingUser.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">ID Pengguna: #{editingUser.id}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-700 font-medium flex items-center gap-1">
                    <KeyRound size={12} />
                    <span>Reset Password (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">Biarkan kosong jika tidak diubah</span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full h-8.5 rounded-lg border border-zinc-200 pl-3 pr-8 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Role Akun</label>
                  <select
                    value={editRole}
                    disabled={editingUser.id === currentUser?.id}
                    onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-2.5 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none bg-white disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    <option value="user">User Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">Akun Anda sendiri</span>
                  )}
                </div>

                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Lead Notif (Menit)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editLeadMinutes}
                    onChange={(e) => setEditLeadMinutes(Number(e.target.value))}
                    className="w-full h-8.5 rounded-lg border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editWaEnabled}
                      onChange={(e) => setEditWaEnabled(e.target.checked)}
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-700 font-medium">WhatsApp Aktif</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsVerified}
                      disabled={editingUser.id === currentUser?.id}
                      onChange={(e) => setEditIsVerified(e.target.checked)}
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-700 font-medium">Terverifikasi</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(editingUser)}
                  disabled={editingUser.id === currentUser?.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer"
                  >
                    {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}