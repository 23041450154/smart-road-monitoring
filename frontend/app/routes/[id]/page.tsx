"use client";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Construction,
  Edit3,
  MapPin,
  MessageSquareText,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { MapPanel } from "@/components/map-panel";
import { RouteEditor } from "@/components/route-editor";
import { ErrorState, PageHeading, StatusBadge, TrendView } from "@/components/ui";
import { RoleGate } from "@/components/role-gate";
import { fetcher, mutateApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Briefing, Camera, Route, WhatsAppTestResponse } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

function RouteDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const [editing, setEditing] = useState(false);

  // WhatsApp simulation state
  const [waLoading, setWaLoading] = useState(false);
  const [waResult, setWaResult] = useState<WhatsAppTestResponse | null>(null);
  const [waError, setWaError] = useState<string | null>(null);

  const { data: route, error } = useSWR<Route>(`/api/routes/${id}`, fetcher);
  const { data: briefing } = useSWR<Briefing>(
    `/api/routes/${id}/briefing`,
    fetcher,
    { refreshInterval: 30_000 },
  );
  const { data: cameras } = useSWR<Camera[]>("/api/cameras", fetcher);

  async function remove() {
    if (!confirm("Hapus rute ini dari daftar pantauan?")) return;
    try {
      await mutateApi(`/api/routes/${id}`, "DELETE");
      router.push("/routes");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus rute");
    }
  }

  async function runWhatsAppSimulation() {
    setWaLoading(true);
    setWaError(null);
    try {
      const res = await mutateApi<WhatsAppTestResponse>(
        `/api/notifications/test-whatsapp/${id}`,
        "POST"
      );
      setWaResult(res);
    } catch (err: unknown) {
      setWaError(err instanceof Error ? err.message : "Gagal memproses simulasi WhatsApp");
    } finally {
      setWaLoading(false);
    }
  }

  if (error) return <ErrorState message="Rute tidak ditemukan." />;
  if (!route || !briefing) return <div className="skeleton h-[70vh] rounded-xl border border-zinc-200" />;
  if (editing) return <RouteEditor route={route} onCancel={() => setEditing(false)} />;

  const canManage = role === "admin" || (user && user.id === route.user_id);

  return (
    <>
      <Link
        href="/routes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Kembali ke Semua Rute</span>
      </Link>

      <PageHeading
        eyebrow={routeLabel(route.route_type)}
        title={route.name}
        description={`${route.path.length} titik koordinat · Buffer deteksi CCTV 500 m · Buffer jalan berlubang 100 m`}
        action={
          canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
              >
                <Edit3 size={14} />
                <span>Edit Rute</span>
              </button>
              <button
                onClick={remove}
                className="grid size-8 place-items-center rounded-lg border border-rose-200/80 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                title="Hapus Rute"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="h-[360px] sm:h-[450px] xl:h-[540px] overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
          <MapPanel
            routes={[route]}
            cameras={cameras}
            potholes={briefing.potholes}
            traffic={briefing.traffic}
          />
        </div>

        <div className="space-y-4">
          {/* WhatsApp Bot Integration & 5-Minute Notification Card */}
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Bot size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    Integrasi Bot WhatsApp
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Notifikasi 5 menit sebelum rute
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                {route.notification_time?.slice(0, 5) ?? "07:00"} WIB
              </span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-3">
              Sistem secara otomatis mengevaluasi kamera & lubang jalan lalu mengirim pesan briefing ke nomor WhatsApp Anda <strong>5 menit sebelum jadwal perjalanan</strong>.
            </p>

            <button
              onClick={runWhatsAppSimulation}
              disabled={waLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition"
            >
              <Send size={13} />
              <span>
                {waLoading
                  ? "Menyiapkan pesan WhatsApp..."
                  : "Simulasikan Kirim WhatsApp (5 Mnt Sebelum)"}
              </span>
            </button>

            {waError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {waError}
              </div>
            )}

            {waResult && (
              <div className="mt-4 pt-3 border-t border-emerald-200">
                <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-2">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 size={13} />
                    Simulasi Berhasil (Outbox Siap)
                  </span>
                  <span className="font-mono text-zinc-500">📱 {waResult.recipient_phone}</span>
                </div>

                {/* WhatsApp Chat Preview Bubble */}
                <div className="rounded-xl border border-zinc-300/80 bg-white p-3.5 text-xs text-zinc-800 whitespace-pre-line leading-relaxed shadow-sm font-sans">
                  {waResult.message}
                </div>
              </div>
            )}
          </article>

          {/* Briefing Box */}
          <article className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                  <MessageSquareText size={16} />
                </span>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Ringkasan Kondisi Rute
                </h2>
              </div>
              <StatusBadge status={briefing.overall_status} />
            </div>
            <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-zinc-600 bg-zinc-50/70 p-3.5 rounded-lg border border-zinc-100">
              {briefing.message}
            </p>
          </article>

          {/* Metric Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium text-zinc-600">CCTV Terdekat</span>
                <MapPin size={15} className="text-zinc-400" />
              </div>
              <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular block">
                {briefing.traffic.length}
              </strong>
            </div>

            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium text-zinc-600">Titik Lubang</span>
                <Construction size={15} className="text-amber-500" />
              </div>
              <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 tabular block">
                {briefing.potholes.length}
              </strong>
            </div>
          </div>

          {/* Near Route Traffic Feeds */}
          <div className="space-y-2.5">
            {briefing.traffic.map((item) => (
              <div
                key={item.camera_id}
                className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-xs sm:text-sm font-semibold text-zinc-900">
                      {item.road_name}
                    </strong>
                    <p className="text-[11px] text-zinc-400">{item.camera_name}</p>
                  </div>
                  <StatusBadge status={item.traffic_status} />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
                  <span className="text-zinc-500">
                    <b className="text-zinc-900 font-semibold tabular">
                      {item.vehicles_per_minute}
                    </b>{" "}
                    kend./menit
                  </span>
                  <TrendView trend={item.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function RouteDetailPage() {
  return (
    <RoleGate
      allowedRoles={["user", "admin"]}
      featureName="Detail Rute & Briefing WhatsApp"
      description="Halaman detail rute dan pengujian briefing WhatsApp hanya dapat diakses oleh pemilik rute atau Administrator."
    >
      <RouteDetailContent />
    </RoleGate>
  );
}
