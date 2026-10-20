"use client";

import {
  Activity,
  AlertTriangle,
  Compass,
  FileText,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Route,
  Settings,
  Shield,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Activity;
  badge?: string;
}

// 1. Publik (Guest, User, Admin)
const publicNav: NavItem[] = [
  { href: "/dashboard", label: "Ringkasan", icon: Activity },
  { href: "/cctv", label: "Kamera CCTV", icon: Video },
  { href: "/map", label: "Peta Mobilitas", icon: Compass },
  { href: "/potholes", label: "Jalan Rusak", icon: AlertTriangle },
];

// 2. Personal (User & Admin)
const userNav: NavItem[] = [
  { href: "/routes", label: "Rute Favorit", icon: Route, badge: "WA" },
  { href: "/settings", label: "Pengaturan Notif", icon: Settings },
];

// 3. Admin Only
const adminNav: NavItem[] = [
  { href: "/admin", label: "Kelola Pengguna", icon: Shield },
  { href: "/admin/logs", label: "Log Notifikasi", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, role, logout } = useAuth();

  // Active navigation items allowed for current role (used by mobile dock)
  const activeNav = role === "admin"
    ? [...publicNav, ...userNav, ...adminNav]
    : role === "user"
    ? [...publicNav, ...userNav]
    : publicNav;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr] bg-slate-50/60">
      {/* 21st.dev Style Clean Light Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[1001] w-[250px] bg-white p-3.5 flex flex-col justify-between border-r border-slate-200/90 text-slate-700 transition-transform lg:translate-x-0 shadow-2xs",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <div className="mb-4 flex items-center justify-between px-2 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              onClick={() => setOpen(false)}
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs shadow-2xs transition group-hover:scale-105">
                L
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight text-slate-900 leading-tight">
                  LAJU Palembang
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Smart Road Mobility
                </span>
              </div>
            </Link>
            <button
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav Section: Pemantauan */}
          <div className="px-2 mb-1 mt-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pemantauan
            </span>
          </div>
          <nav className="space-y-0.5 mb-4">
            {publicNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-blue-50 font-medium text-blue-700 border border-blue-100/70 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                >
                  <item.icon
                    size={15}
                    className={cn(
                      "shrink-0",
                      active ? "text-blue-600" : "text-slate-400",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Nav Section: Layanan Pribadi */}
          <div className="px-2 mb-1 mt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Layanan Pribadi
            </span>
          </div>
          <nav className="space-y-0.5 mb-4">
            {userNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isLockedForGuest = role === "guest";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-blue-50 font-medium text-blue-700 border border-blue-100/70 shadow-2xs"
                      : isLockedForGuest
                      ? "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      size={15}
                      className={cn(
                        "shrink-0",
                        active ? "text-blue-600" : "text-slate-400",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isLockedForGuest ? (
                    <Lock size={11} className="text-slate-350 shrink-0" />
                  ) : item.badge ? (
                    <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-mono px-1.5 py-0.2">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Nav Section: Administrator */}
          {role === "admin" && (
            <>
              <div className="px-2 mb-1 mt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Administrasi
                </span>
              </div>
              <nav className="space-y-0.5">
                {adminNav.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        active
                          ? "bg-blue-50 font-medium text-blue-700 border border-blue-100/70 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          size={15}
                          className={cn(
                            "shrink-0",
                            active ? "text-blue-600" : "text-slate-400",
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="rounded bg-slate-100 text-slate-600 border border-slate-200/80 text-[9px] font-mono px-1.5 py-0.2">
                        Root
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {/* Sidebar Footer (User Profile) */}
        <div className="border-t border-slate-200/80 pt-3">
          {user ? (
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 transition group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-medium text-slate-900 truncate">{user.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {user.phone_number ? `WA: ${user.phone_number}` : user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition"
                title="Keluar dari akun"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50/60 hover:border-blue-200 hover:text-blue-700 transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-6 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-blue-600 shrink-0">
                  <UserIcon size={12} />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-medium text-slate-800 group-hover:text-blue-700">Masuk Akun</span>
                  <span className="text-[10px] text-slate-400">Aktifkan bot WA</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {open && (
        <button
          className="fixed inset-0 z-[1000] bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
        />
      )}

      {/* Main Content Area */}
      <div className="min-w-0 lg:col-start-2 flex flex-col">
        {/* Sleek Minimal Header Bar */}
        <header className="sticky top-0 z-[900] flex h-13 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={16} />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 lg:hidden"
            >
              <span className="grid size-6 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white">
                L
              </span>
              <span className="font-semibold text-xs tracking-tight text-slate-900">
                LAJU
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <span className="block text-xs font-medium text-slate-800">
                    {user.name}
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                  title="Keluar"
                >
                  <LogOut size={12} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              pathname !== "/login" && (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 transition"
                >
                  <LogIn size={12} />
                  <span>Masuk Akun</span>
                </Link>
              )
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-7 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock */}
      <nav
        className="fixed inset-x-3 bottom-3 z-[950] grid gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 text-slate-500 shadow-xl backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${activeNav.length}, minmax(0, 1fr))` }}
      >
        {activeNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[9px] font-medium transition",
                active
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-2xs"
                  : "hover:text-slate-900 hover:bg-slate-50/80",
              )}
            >
              <item.icon
                size={15}
                className={active ? "text-blue-600" : "text-slate-400"}
              />
              <span className="truncate max-w-full">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
