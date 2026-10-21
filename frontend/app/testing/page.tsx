"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Route as RouteIcon,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function TestingPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loadingRole, setLoadingRole] = useState<"user" | "admin" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleInstantLogin = async (email: string, pass: string, targetPath: string, roleType: "user" | "admin") => {
    setError(null);
    setLoadingRole(roleType);
    try {
      await login(email, pass);
      router.push(targetPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Silakan coba lagi.");
      setLoadingRole(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1">
            <span>Palembang Smart Mobility (LAJU)</span>
            <span>/</span>
            <span className="font-medium text-zinc-700">Evaluasi & Pengujian Dosen</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Portal Pengujian & Evaluasi Sistem
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
            Halaman khusus evaluasi untuk Dosen Penguji dan Asesor. Pilih salah satu profil di bawah untuk login instan dalam 1 klik dan langsung menguji kapabilitas sistem.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition"
        >
          <ArrowLeft size={13} />
          <span>Login Standar Publik</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* 2 Big Role Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* CARD 1: USER TESTING */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/80">
                <UserCheck size={13} />
                Role: Pengguna Biasa (Warga)
              </span>
              <span className="text-[11px] font-mono text-zinc-400">ID #5</span>
            </div>

            <h2 className="text-base font-bold text-zinc-900">
              Pengujian Pengguna (User)
            </h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Menguji pengalaman warga Palembang dalam memantau kondisi lalu lintas, titik kemacetan, dan mengonfigurasi jalur perjalanan harian.
            </p>

            <div className="my-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-zinc-400" />
                  Email:
                </span>
                <span className="font-mono font-semibold text-zinc-800">user@test.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Lock size={13} className="text-zinc-400" />
                  Password:
                </span>
                <span className="font-mono font-semibold text-zinc-800">test</span>
              </div>
            </div>

            <div className="space-y-1.5 mb-5 text-xs text-zinc-600">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Fitur yang Dapat Diuji:
              </span>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Dashboard telemetri volume kendaraan & titik macet</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Streaming 8 titik CCTV Palembang + deteksi YOLO</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Peta spasial GIS rute perjalanan & kondisi jalan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Buat rute baru & atur notifikasi WhatsApp</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleInstantLogin("user@test.com", "test", "/dashboard", "user")}
            disabled={loadingRole !== null}
            className="w-full h-10 rounded-xl bg-zinc-950 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingRole === "user" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menghubungkan Akun User...</span>
              </>
            ) : (
              <>
                <span>Masuk Otomatis sebagai User</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {/* CARD 2: ADMIN TESTING */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200/80">
                <ShieldCheck size={13} />
                Role: Administrator (Admin)
              </span>
              <span className="text-[11px] font-mono text-zinc-400">ID #6</span>
            </div>

            <h2 className="text-base font-bold text-zinc-900">
              Pengujian Administrator (Admin)
            </h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Menguji kapabilitas manajemen penuh sistem: kelola pengguna terdaftar, reset password, simulasi bot WhatsApp, dan audit rute warga.
            </p>

            <div className="my-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-zinc-400" />
                  Email:
                </span>
                <span className="font-mono font-semibold text-zinc-800">admin@test.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Lock size={13} className="text-zinc-400" />
                  Password:
                </span>
                <span className="font-mono font-semibold text-zinc-800">test</span>
              </div>
            </div>

            <div className="space-y-1.5 mb-5 text-xs text-zinc-600">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Fitur yang Dapat Diuji:
              </span>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Panel Admin & Manajemen Pengguna Lengkap (CRUD)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Tambah user baru, edit data, reset sandi, & hapus</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>1-Klik toggle verifikasi status email pengguna</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Simulator WhatsApp Bot pengiriman briefing rute 5 menit</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleInstantLogin("admin@test.com", "test", "/admin", "admin")}
            disabled={loadingRole !== null}
            className="w-full h-10 rounded-xl bg-zinc-950 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingRole === "admin" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menghubungkan Akun Admin...</span>
              </>
            ) : (
              <>
                <span>Masuk Otomatis sebagai Admin</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Credentials Reference Table */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Tabel Kredensial Pengujian Manual
            </h3>
            <p className="text-xs text-zinc-500">
              Jika ingin mencoba masuk melalui form login standar secara manual:
            </p>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 transition"
          >
            Buka Halaman Login &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Email Akun</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 px-3">Status Verifikasi</th>
                <th className="py-2.5 px-3 text-right">Salin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-blue-700">User Biasa</td>
                <td className="py-2.5 px-3 text-zinc-800">user@test.com</td>
                <td className="py-2.5 px-3 text-zinc-800">test</td>
                <td className="py-2.5 px-3 font-sans text-emerald-700 font-medium">Terverifikasi</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => copyToClipboard("user@test.com:test", "user")}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-sans text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>{copiedKey === "user" ? "Disalin!" : "Salin"}</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-rose-700">Administrator</td>
                <td className="py-2.5 px-3 text-zinc-800">admin@test.com</td>
                <td className="py-2.5 px-3 text-zinc-800">test</td>
                <td className="py-2.5 px-3 font-sans text-emerald-700 font-medium">Terverifikasi</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => copyToClipboard("admin@test.com:test", "admin")}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-sans text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>{copiedKey === "admin" ? "Disalin!" : "Salin"}</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-zinc-700">Admin Utama</td>
                <td className="py-2.5 px-3 text-zinc-800">admin@naufal.me</td>
                <td className="py-2.5 px-3 text-zinc-800">Garena123</td>
                <td className="py-2.5 px-3 font-sans text-emerald-700 font-medium">Terverifikasi</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => copyToClipboard("admin@naufal.me:Garena123", "naufal")}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-sans text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>{copiedKey === "naufal" ? "Disalin!" : "Salin"}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
