"use client";

import { Eye, EyeOff, KeyRound, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface AuthViewProps {
  isTesting?: boolean;
}

export function AuthView({ isTesting = false }: AuthViewProps) {
  const router = useRouter();
  const { login, sendVerificationOtp, verifyRegistration } = useAuth();

  // Mode: "login" | "register" | "verify"
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("smartroad_remembered_email") || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("smartroad_remembered_email"));
      } catch {
        return false;
      }
    }
    return false;
  });

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first input box on verify screen
  useEffect(() => {
    if (mode === "verify") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);
    }
  }, [mode]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);
      try {
        if (rememberMe) {
          localStorage.setItem("smartroad_remembered_email", email.trim());
        } else {
          localStorage.removeItem("smartroad_remembered_email");
        }
      } catch {
        // ignore storage error
      }
      if (loggedUser?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Email atau kata sandi tidak sesuai.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (Step 1)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      await sendVerificationOtp(email.trim(), name.trim());
      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setMode("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim kode verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  // OTP 6-box handlers
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = pastedData[i] || "";
    }
    setOtp(updated);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handle Verify (Step 2)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await verifyRegistration(name.trim(), email.trim(), password, code, phone.trim());
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kode verifikasi salah atau telah kedaluwarsa."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);

    try {
      await sendVerificationOtp(email.trim(), name.trim());
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang kode.");
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((d) => d.length === 1);

  return (
    <div className="flex min-h-[calc(100vh-140px)] w-full items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm tracking-tight mb-3.5 shadow-2xs">
            L
          </div>

          {isTesting && (
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 shadow-2xs">
              <KeyRound size={12} className="text-blue-600" />
              <span>Portal Pengujian Dosen & Demo</span>
            </div>
          )}

          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            {mode === "login" && (isTesting ? "Login Akun Pengujian" : "Selamat datang kembali")}
            {mode === "register" && "Buat akun baru"}
            {mode === "verify" && "Verifikasi email"}
          </h1>
          <p className="mt-1 text-xs text-zinc-500 max-w-[300px]">
            {mode === "login" &&
              (isTesting
                ? "Pilih tombol autofill di bawah atau isi kredensial pengujian secara manual."
                : "Masukkan detail akun Anda untuk melanjutkan.")}
            {mode === "register" && "Daftar untuk memantau rute dan menerima notifikasi."}
            {mode === "verify" && `Kode 6 digit telah dikirim ke ${email}`}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200/80 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* 1. LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Autofill Buttons - Only visible when isTesting is TRUE */}
              {isTesting && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-800 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-600" />
                      Pilih Akun Demo (Auto-Fill Form)
                    </span>
                    <span className="text-[10px] text-blue-600 font-mono">1-Klik Isi</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("user@test.com");
                        setPassword("test");
                        setError(null);
                      }}
                      className={`flex flex-col items-start rounded-lg border p-2 text-left transition cursor-pointer ${
                        email === "user@test.com"
                          ? "border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-2xs"
                          : "border-zinc-200/90 bg-white/80 hover:bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-zinc-900 text-[11px]">User Testing</span>
                        <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700">USER</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-full">user@test.com</span>
                      <span className="text-[9px] font-mono text-zinc-400">pass: test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail("admin@test.com");
                        setPassword("test");
                        setError(null);
                      }}
                      className={`flex flex-col items-start rounded-lg border p-2 text-left transition cursor-pointer ${
                        email === "admin@test.com"
                          ? "border-rose-600 bg-white ring-2 ring-rose-500/20 shadow-2xs"
                          : "border-zinc-200/90 bg-white/80 hover:bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-zinc-900 text-[11px]">Admin Testing</span>
                        <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700">ADMIN</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-full">admin@test.com</span>
                      <span className="text-[9px] font-mono text-zinc-400">pass: test</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@naufal.me");
                      setPassword("Garena123");
                      setError(null);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition cursor-pointer text-xs ${
                      email === "admin@naufal.me"
                        ? "border-zinc-950 bg-white ring-2 ring-zinc-900/10 shadow-2xs"
                        : "border-zinc-200/80 bg-white/80 hover:bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-900 text-[11px]">Admin Utama</span>
                      <span className="text-[10px] font-mono text-zinc-500">admin@naufal.me</span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">pass: Garena123</span>
                  </button>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus={!isTesting}
                  placeholder="contoh@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-1 focus:ring-zinc-950 accent-zinc-950 transition"
                  />
                  <span>Ingat saya</span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-9 w-full rounded-lg bg-zinc-950 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Masuk"
                )}
              </button>

              <div className="pt-2 text-center text-xs text-zinc-500">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("register");
                  }}
                  className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 transition"
                >
                  Daftar
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 transition"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700">
                    Nomor WhatsApp
                  </label>
                  <span className="text-[10px] text-zinc-400">Opsional</span>
                </div>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-9 w-full rounded-lg bg-zinc-950 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Mengirim kode...</span>
                  </>
                ) : (
                  "Lanjutkan"
                )}
              </button>

              <div className="pt-2 text-center text-xs text-zinc-500">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("login");
                  }}
                  className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 transition"
                >
                  Masuk
                </button>
              </div>
            </form>
          )}

          {/* 3. VERIFY (6-BOX OTP) */}
          {mode === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Masukkan kode</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("register");
                  }}
                  className="text-zinc-900 hover:underline"
                >
                  Ganti email
                </button>
              </div>

              {/* 6 Box Inputs */}
              <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                {otp.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="size-11 sm:size-12 rounded-lg border border-zinc-200 bg-white text-center font-mono text-base font-semibold text-zinc-950 transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !isOtpComplete}
                className="h-9 w-full rounded-lg bg-zinc-950 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  "Verifikasi & Masuk"
                )}
              </button>

              <div className="text-center text-xs text-zinc-500">
                {resendCooldown > 0 ? (
                  <span>Kirim ulang kode dalam {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-700 transition"
                  >
                    Kirim ulang kode
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Links at footer */}
          <div className="mt-5 border-t border-zinc-100 pt-3 flex items-center justify-between text-[11px] text-zinc-400">
            {isTesting ? (
              <>
                <Link
                  href="/login"
                  className="hover:text-zinc-800 transition underline underline-offset-2"
                >
                  &larr; Form Login Biasa
                </Link>
                <Link
                  href="/dashboard"
                  className="hover:text-zinc-800 transition"
                >
                  Mode Tamu &rarr;
                </Link>
              </>
            ) : (
              <div className="w-full text-center">
                <Link
                  href="/dashboard"
                  className="text-zinc-400 hover:text-zinc-700 transition"
                >
                  Lanjutkan tanpa login &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
