"use client";

import {
  LogIn,
  LogOut,
  Menu,
  Settings,
  Shield,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Video;
}

const mainNav: NavItem[] = [
  { href: "/cctv", label: "Kamera CCTV", icon: Video },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Kelola Pengguna", icon: Shield },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, role, logout } = useAuth();

  const activeNav = role === "admin" ? [...mainNav, ...adminNav] : mainNav;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr] bg-slate-50 text-slate-900">
      {/* Sidebar Navigasi */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[1001] w-[250px] bg-white p-3.5 flex flex-col justify-between border-r border-slate-200 text-slate-700 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <div className="mb-4 flex items-center justify-between px-2 pt-1">
            <Link
              href="/cctv"
              className="flex items-center gap-2.5 group"
              onClick={() => setOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="LAJU Palembang"
                width={32}
                height={32}
                className="size-8 shrink-0 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight text-slate-900 leading-tight">
                  LAJU Palembang
                </span>
                <span className="text-[11px] text-slate-600 font-normal">
                  Pemantauan Lalu Lintas
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-md hover:bg-slate-100 transition"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="px-2 mb-1 mt-2">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              Menu
            </span>
          </div>
          <nav aria-label="Menu utama" className="space-y-0.5 mb-4">
            {mainNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[38px] items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-blue-50 font-semibold text-blue-700 border border-blue-100"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      size={15}
                      aria-hidden="true"
                      className={cn("shrink-0", active ? "text-blue-700" : "text-slate-600")}
                    />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {role === "admin" && (
            <>
              <div className="px-2 mb-1 mt-1">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Administrasi
                </span>
              </div>
              <nav aria-label="Menu admin" className="space-y-0.5">
                {adminNav.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-[38px] items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        active
                          ? "bg-blue-50 font-semibold text-blue-700 border border-blue-100"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          size={15}
                          aria-hidden="true"
                          className={cn("shrink-0", active ? "text-blue-700" : "text-slate-600")}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-200 pt-3">
          {user ? (
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 transition">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                title="Buka Pengaturan Akun"
              >
                <div className="size-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-medium text-slate-900 truncate">{user.name}</span>
                  <span className="text-[11px] text-slate-600 truncate">
                    {user.phone_number ? `WA: ${user.phone_number}` : user.email}
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-0.5">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  aria-label="Pengaturan akun"
                  className="text-slate-600 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition"
                  title="Pengaturan"
                >
                  <Settings size={13} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Keluar dari akun"
                  className="text-slate-600 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition"
                  title="Keluar dari akun"
                >
                  <LogOut size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <UserIcon size={12} aria-hidden="true" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-medium text-slate-900">Masuk Akun</span>
                  <span className="text-[11px] text-slate-600">Aktifkan bot WA</span>
                </div>
              </div>
              <LogIn size={13} aria-hidden="true" className="text-slate-600 shrink-0" />
            </Link>
          )}
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[1000] bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
        />
      )}

      {/* Main Content Area */}
      <div className="min-w-0 lg:col-start-2 flex flex-col">
        <header className="sticky top-0 z-[900] flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-expanded={open}
            >
              <Menu size={16} aria-hidden="true" />
            </button>
            <Link href="/cctv" className="flex items-center gap-2 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="LAJU Palembang"
                width={28}
                height={28}
                className="size-7 shrink-0 object-contain"
              />
              <span className="font-semibold text-xs tracking-tight text-slate-900">
                LAJU Palembang
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <span className="block text-xs font-medium text-slate-900">
                    {user.name}
                  </span>
                  <span className="block text-[10px] text-slate-600 uppercase font-mono">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                  title="Keluar"
                >
                  <LogOut size={12} aria-hidden="true" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              pathname !== "/login" && (
                <Link
                  href="/login"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 transition"
                >
                  <LogIn size={12} aria-hidden="true" />
                  <span>Masuk Akun</span>
                </Link>
              )
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-7 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-3 bottom-3 z-[950] grid gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-600 shadow-lg lg:hidden"
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
                "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[10px] font-medium transition",
                active
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50",
              )}
            >
              <item.icon
                size={15}
                aria-hidden="true"
                className={active ? "text-blue-700" : "text-slate-600"}
              />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
