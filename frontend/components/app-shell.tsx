"use client";

import {
  Camera,
  CircleGauge,
  Construction,
  Map,
  Menu,
  Route,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Ringkasan", icon: CircleGauge },
  { href: "/cctv", label: "CCTV", icon: Camera },
  { href: "/map", label: "Peta", icon: Map },
  { href: "/routes", label: "Rute Saya", icon: Route },
  { href: "/potholes", label: "Jalan Berlubang", icon: Construction },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr] bg-zinc-50/50">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[1001] w-[260px] bg-zinc-950 p-4 flex flex-col justify-between border-r border-zinc-800/80 text-zinc-200 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div>
          {/* Logo & Brand */}
          <div className="mb-6 flex items-center justify-between px-2 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              onClick={() => setOpen(false)}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-white font-bold text-zinc-950 text-sm shadow-xs transition group-hover:scale-105">
                L
              </span>
              <div>
                <span className="block text-sm font-semibold tracking-tight text-white leading-tight">
                  LAJU
                </span>
                <span className="block text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
                  Palembang Smart Road
                </span>
              </div>
            </Link>
            <button
              className="lg:hidden text-zinc-400 hover:text-white p-1"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-2 mb-2">
            <span className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
              Pusat Kendali
            </span>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                      : "text-zinc-300 hover:bg-zinc-900/80 hover:text-zinc-100",
                  )}
                >
                  <item.icon
                    size={16}
                    className={cn(
                      "shrink-0",
                      active ? "text-blue-400" : "text-zinc-400",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System / Demo Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs text-zinc-400">
          <div className="mb-1.5 flex items-center gap-2 font-medium text-zinc-200">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mode Aktif</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Data live & simulasi untuk evaluasi pemantauan jalan Palembang.
          </p>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {open && (
        <button
          className="fixed inset-0 z-[1000] bg-zinc-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
        />
      )}

      {/* Main Content Area */}
      <div className="min-w-0 lg:col-start-2 flex flex-col">
        {/* Header Bar */}
        <header className="sticky top-0 z-[900] flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="grid size-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:bg-zinc-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={16} />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 lg:hidden"
            >
              <span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-xs font-bold text-white">
                L
              </span>
              <span className="font-semibold text-sm tracking-tight text-zinc-900">
                LAJU
              </span>
            </Link>
            <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 lg:flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Sistem Operasional Aktif</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <strong className="block text-xs font-semibold text-zinc-800">
                Operator Pengawas
              </strong>
              <small className="text-[11px] text-zinc-400">Asia/Jakarta</small>
            </div>
            <div className="grid size-8 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white shadow-xs">
              OP
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock */}
      <nav className="fixed inset-x-3 bottom-3 z-[950] grid grid-cols-6 gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-1.5 text-zinc-400 shadow-2xl backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[9px] font-medium transition",
                active
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "hover:text-zinc-200",
              )}
            >
              <item.icon
                size={16}
                className={active ? "text-blue-400" : "text-zinc-400"}
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
