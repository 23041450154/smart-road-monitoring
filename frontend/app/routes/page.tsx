"use client";

import {
  ArrowRight,
  Clock3,
  MapPin,
  MessageSquare,
  Plus,
  Route as RouteIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { RoleGate } from "@/components/role-gate";
import { RouteEditor } from "@/components/route-editor";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Route } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

function RoutesContent() {
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { data: routes, error } = useSWR<Route[]>("/api/routes", fetcher);

  return (
    <>
      <PageHeading
        eyebrow="Manajemen Perjalanan"
        title="Rute Perjalanan Saya"
        description="Kelola koridor rute harian Anda. Titik pengawas CCTV dan laporan jalan berlubang di sepanjang jalur rute akan dipetakan dan dikirimkan sebagai briefing WhatsApp 5 menit sebelum keberangkatan."
        action={
          <button
            onClick={() => setCreating((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
          >
            <Plus size={14} />
            <span>Buat Rute Baru</span>
          </button>
        }
      />

      {creating && (
        <div className="mb-6">
          <RouteEditor onCancel={() => setCreating(false)} />
        </div>
      )}

      {error ? (
        <ErrorState />
      ) : !routes ? (
        <div className="skeleton h-40 rounded-xl border border-zinc-200" />
      ) : !routes.length ? (
        <EmptyState
          title="Belum Ada Rute Tersimpan"
          description="Tambahkan rute pertama Anda dengan menentukan titik-titik koordinat pada peta."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => (
            <Link
              href={`/routes/${route.id}`}
              key={route.id}
              className="group rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                    <RouteIcon size={14} />
                    {routeLabel(route.route_type)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                      route.is_active
                        ? "text-emerald-600"
                        : "text-zinc-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        route.is_active ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                    />
                    {route.is_active ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                  {route.name}
                </h2>

                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-zinc-400" />
                    <span>{route.path.length} titik koordinat</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 size={13} className="text-zinc-400" />
                    <span>{route.notification_time?.slice(0, 5) ?? "07:00"}</span>
                  </span>
                </div>

                {/* WhatsApp notification indicator */}
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <MessageSquare size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Notif WA:{" "}
                    <strong className="text-zinc-800">
                      {user?.notification_lead_minutes ?? 5} mnt sebelum{" "}
                      {route.notification_time?.slice(0, 5) ?? "07:00"} WIB
                    </strong>
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
                <span>Lihat Briefing & Tes WhatsApp</span>
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function RoutesPage() {
  return (
    <RoleGate
      allowedRoles={["user", "admin"]}
      featureName="Rute Saya & Notifikasi WhatsApp"
      description="Menu Rute Saya dikhususkan untuk pengguna terdaftar yang ingin menyimpan rute harian pribadi dan mengaktifkan notifikasi bot WhatsApp 5 menit sebelum jam keberangkatan."
    >
      <RoutesContent />
    </RoleGate>
  );
}
