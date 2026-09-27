"use client";

import { ArrowRight, Clock3, MapPin, Plus, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { RouteEditor } from "@/components/route-editor";
import { EmptyState, ErrorState, PageHeading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Route } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

export default function RoutesPage() {
  const [creating, setCreating] = useState(false);
  const { data: routes, error } = useSWR<Route[]>("/api/routes", fetcher);

  return (
    <>
      <PageHeading
        eyebrow="Manajemen Perjalanan"
        title="Rute Perjalanan Saya"
        description="Kelola koridor rute harian Anda. Titik pengawas CCTV dan laporan jalan berlubang di sepanjang jalur rute akan dipetakan dan dikirimkan sebagai briefing."
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
                <div className="mb-4 flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                    <RouteIcon size={18} />
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                      route.is_active
                        ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    {route.is_active ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>

                <span className="text-xs font-medium text-blue-600">
                  {routeLabel(route.route_type)}
                </span>
                <h2 className="mt-1 text-base font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                  {route.name}
                </h2>

                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-zinc-400" />
                    <span>{route.path.length} titik koordinat</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 size={13} className="text-zinc-400" />
                    <span>{route.notification_time?.slice(0, 5) ?? "—"}</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
                <span>Lihat Briefing Rute</span>
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
