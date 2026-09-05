"use client";

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { Pothole } from "@/lib/types";
import { dateTime } from "@/lib/utils";
import { API_URL } from "@/lib/api";

interface PotholeMarkerProps {
  pothole: Pothole;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

function getSeverityBadge(severity: Pothole["severity"]) {
  switch (severity) {
    case "high":
      return { bg: "bg-red-100", text: "text-red-800", label: "Tinggi" };
    case "medium":
      return { bg: "bg-amber-100", text: "text-amber-800", label: "Sedang" };
    case "low":
      return { bg: "bg-yellow-100", text: "text-yellow-800", label: "Rendah" };
    case "unknown":
    default:
      return { bg: "bg-slate-100", text: "text-slate-800", label: "Belum terukur" };
  }
}

function getStatusBadge(status: Pothole["status"]) {
  switch (status) {
    case "active":
      return { bg: "bg-rose-50 border-rose-200 text-rose-700", label: "Aktif" };
    case "repaired":
      return { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Diperbaiki" };
    case "unverified":
    default:
      return { bg: "bg-slate-50 border-slate-200 text-slate-700", label: "Belum Verifikasi" };
  }
}

export function PotholeMarker({ pothole, isHighlighted, isDimmed }: PotholeMarkerProps) {
  const opacity = isDimmed ? 0.35 : 1.0;
  const ringStyle = isHighlighted
    ? "box-shadow: 0 0 0 4px #ff7849, 0 4px 14px rgba(0,0,0,0.35);"
    : "box-shadow: 0 3px 8px rgba(0,0,0,0.22);";

  const customIcon = L.divIcon({
    className: "smartroad-pothole-pin",
    html: `
      <div style="opacity: ${opacity}; transition: all 0.2s;" title="Jalan Berlubang #${pothole.id}">
        <div style="
          background: #ea580c;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          ${ringStyle}
        ">
          <span style="font-size: 13px; font-weight: 900;">▲</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  const severityBadge = getSeverityBadge(pothole.severity);
  const statusBadge = getStatusBadge(pothole.status);

  // Derive evidence image URL if available
  const evidenceFilename = pothole.image_path ? pothole.image_path.split("/").pop() : null;
  const evidenceUrl = evidenceFilename ? `${API_URL}/evidence/${evidenceFilename}` : null;

  return (
    <Marker position={[pothole.latitude, pothole.longitude]} icon={customIcon}>
      <Popup className="smartroad-popup">
        <div className="min-w-60 p-1 text-slate-800">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              ⚠️ Titik Jalan Berlubang
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusBadge.bg}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <h4 className="mt-2 text-sm font-bold">
            {pothole.road_name ?? "Lokasi belum bernama"}
          </h4>
          <p className="text-[11px] font-mono text-slate-500">
            {pothole.latitude.toFixed(6)}, {pothole.longitude.toFixed(6)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-xs">
            <div>
              <span className="block text-[10px] text-slate-400">Keparahan:</span>
              <span
                className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${severityBadge.bg} ${severityBadge.text}`}
              >
                {severityBadge.label}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Confidence:</span>
              <span className="mt-0.5 block font-mono font-bold text-slate-700">
                {Math.round(pothole.confidence * 100)}%
              </span>
            </div>
          </div>

          {evidenceUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
              <div className="px-2 py-1 text-[9px] font-bold uppercase text-white/70">
                Bukti Gambar
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidenceUrl}
                alt="Bukti foto jalan berlubang"
                className="h-28 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}

          <p className="mt-3 text-[10px] text-slate-400">
            Terdeteksi: {dateTime(pothole.detected_at)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
