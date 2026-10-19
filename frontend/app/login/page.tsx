"use client";

import { ArrowRight, Bot, CheckCircle2, Lock, Mail, MessageSquare, Phone, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password, phone);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan pada sistem autentikasi");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal masuk dengan akun demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-6 sm:py-10">
      {/* Brand & Heading */}
      <div className="text-center mb-8">
        <div className="inline-grid size-12 place-items-center rounded-xl bg-blue-600 font-bold text-white text-lg shadow-md mb-3">
          L
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {tab === "login" ? "Masuk ke Akun LAJU" : "Daftar Akun Baru"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
          {tab === "login"
            ? "Akses rute perjalanan pribadi dan pantau integrasi notifikasi lalu lintas WhatsApp."
            : "Buat akun untuk mengaktifkan notifikasi bot WhatsApp 5 menit sebelum rute keberangkatan."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-zinc-200/70 p-1 mb-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            tab === "login"
              ? "bg-white text-zinc-950 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            tab === "register"
              ? "bg-white text-zinc-950 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {/* Main Form Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 grid w-10 place-items-center text-zinc-400">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Mis. Ahmad Farhan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 grid w-10 place-items-center text-zinc-400">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 grid w-10 place-items-center text-zinc-400">
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          {tab === "register" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  Nomor WhatsApp
                </label>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <Bot size={11} />
                  Integrasi Bot WA
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 grid w-10 place-items-center text-zinc-400">
                  <Phone size={15} />
                </span>
                <input
                  type="tel"
                  placeholder="08123456789 atau 628123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 shadow-xs focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500 leading-normal">
                Bot WhatsApp akan mengirimkan kondisi lalu lintas & lubang rute Anda <strong>5 menit sebelum jadwal keberangkatan</strong>.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : tab === "login" ? (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <span>Daftar & Aktifkan Notifikasi WA</span>
                <CheckCircle2 size={14} />
              </>
            )}
          </button>
        </form>

        {/* Guest monitoring link */}
        <div className="mt-5 text-center border-t border-zinc-100 pt-4">
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition"
          >
            Lanjutkan tanpa login &rarr; (Mode Pantau Tamu)
          </Link>
        </div>
      </div>

      {/* Quick Demo Test Buttons */}
      <div className="mt-6 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span>Akses Cepat Pengujian Lokal:</span>
        </div>
        <p className="text-[11px] text-blue-700 leading-relaxed mb-3">
          Gunakan akun bawaan sistem untuk menguji hak akses role dan simulasi bot WhatsApp:
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("demo@example.local", "demo123")}
            disabled={loading}
            className="rounded-xl border border-blue-200 bg-white p-2.5 text-left shadow-2xs hover:border-blue-400 hover:bg-blue-50/40 transition"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-900">
              <span>Pengguna Demo</span>
              <span className="text-[10px] text-blue-600 font-medium">user</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">demo@example.local</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <MessageSquare size={10} />
              <span>WA: 081234567890</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("admin@smartroad.local", "admin123")}
            disabled={loading}
            className="rounded-xl border border-rose-200 bg-white p-2.5 text-left shadow-2xs hover:border-rose-400 hover:bg-rose-50/40 transition"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-900">
              <span>Administrator</span>
              <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-700">admin</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">admin@smartroad.local</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Hak akses penuh kelola user & CCTV
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
