"use client";

import { ArrowLeft, Lock, LogIn, ShieldAlert, UserCheck } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";

interface RoleGateProps {
  allowedRoles: Array<"guest" | UserRole>;
  children: React.ReactNode;
  title?: string;
  description?: string;
  featureName?: string;
}

export function RoleGate({
  allowedRoles,
  children,
  title,
  description,
  featureName = "Halaman ini",
}: RoleGateProps) {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="skeleton mx-auto h-48 max-w-md rounded-2xl border border-zinc-200" />
      </div>
    );
  }

  // If user has the required role, render children
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  // Otherwise, render role-specific access gate
  const isGuest = role === "guest";
  const requiresAdmin = allowedRoles.length === 1 && allowedRoles[0] === "admin";

  return (
    <div className="mx-auto max-w-lg py-12 px-4 text-center">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xs">
        <div
          className={`mx-auto mb-4 grid size-12 place-items-center rounded-2xl ${
            requiresAdmin
              ? "bg-rose-50 text-rose-600 border border-rose-200/60"
              : "bg-blue-50 text-blue-600 border border-blue-200/60"
          }`}
        >
          {requiresAdmin ? <ShieldAlert size={24} /> : isGuest ? <Lock size={22} /> : <UserCheck size={22} />}
        </div>

        <span
          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-2 ${
            requiresAdmin
              ? "bg-rose-100 text-rose-800"
              : isGuest
              ? "bg-amber-100 text-amber-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {requiresAdmin
            ? "Khusus Administrator"
            : isGuest
            ? "Diperlukan Akun Pengguna"
            : "Hak Akses Tidak Sesuai"}
        </span>

        <h1 className="text-lg font-bold text-zinc-900">
          {title || (requiresAdmin ? "Akses Terbatas Administrator" : `Masuk untuk Mengakses ${featureName}`)}
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
          {description ||
            (isGuest
              ? `${featureName} dikhususkan untuk pengguna terdaftar yang ingin menyimpan rute harian pribadi dan mengaktifkan notifikasi bot WhatsApp 5 menit sebelum rute.`
              : `${featureName} hanya dapat diakses oleh akun dengan role Administrator.`)}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {isGuest ? (
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
            >
              <LogIn size={14} />
              <span>Masuk atau Daftar Akun</span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Dashboard</span>
            </Link>
          )}

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            <span>Mode Pantau Publik</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
