"use client";

import {
  Camera, CircleGauge, Construction, Map, Menu, Route, Settings, X,
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
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[1001] w-[250px] bg-[#102c27] p-5 text-white transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="mb-9 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid size-10 place-items-center rounded-xl bg-[#c9f260] font-black text-[#10201d]">L</span>
            <span><strong className="display block text-xl leading-none">LAJU</strong><small className="text-[10px] tracking-[.22em] text-white/55">PALEMBANG</small></span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Pusat Kendali</p>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  active ? "bg-[#c9f260] text-[#10201d] shadow-[0_8px_24px_rgba(201,242,96,.15)]" : "text-white/65 hover:bg-white/7 hover:text-white")}
              ><item.icon size={18} strokeWidth={2.2} />{item.label}</Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold"><span className="size-2 rounded-full bg-[#c9f260] shadow-[0_0_10px_#c9f260]" /> MODE DEMO</div>
          <p className="text-xs leading-relaxed text-white/45">Data simulasi untuk pengembangan. Bukan kondisi jalan aktual.</p>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-[1000] bg-black/35 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu" />}
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-[900] flex h-16 items-center justify-between border-b border-black/7 bg-[#f4f3ed]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs font-semibold text-[#64726e] lg:flex"><span className="size-2 rounded-full bg-emerald-500" />Sistem operasional</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block"><strong className="block text-xs">Operator Demo</strong><small className="text-[10px] text-[#64726e]">Asia/Jakarta</small></span>
            <span className="grid size-9 place-items-center rounded-full bg-[#ff7849] text-xs font-black text-white">OD</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-7 lg:p-9">{children}</main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-[950] flex justify-around rounded-2xl border border-white/10 bg-[#102c27]/95 p-2 text-white shadow-2xl backdrop-blur-xl lg:hidden">
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} className={cn("grid min-w-12 place-items-center gap-1 rounded-xl p-2 text-[9px] font-bold", active && "bg-[#c9f260] text-[#10201d]")}><item.icon size={17} /><span>{item.label.split(" ")[0]}</span></Link>;
        })}
      </nav>
    </div>
  );
}
