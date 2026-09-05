"use client";

import L from "leaflet";
import Link from "next/link";
import { Marker, Popup } from "react-leaflet";
import type { Camera, TrafficCurrent } from "@/lib/types";
import { dateTime } from "@/lib/utils";
import { StatusBadge, TrendView } from "@/components/ui";

interface CameraMarkerProps {
  camera: Camera;
  current?: TrafficCurrent;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

function getCameraStatusColor(status?: string): string {
  switch (status) {
    case "LANCAR":
      return "#10b981"; // emerald-500
    case "SEDANG":
      return "#f59e0b"; // amber-500
    case "PADAT":
      return "#f97316"; // orange-500
    case "MACET":
      return "#ef4444"; // red-500
    default:
      return "#64748b"; // slate-500 (offline/unknown)
  }
}

function getCameraStatusIcon(status?: string): string {
  switch (status) {
    case "LANCAR":
      return "✓";
    case "SEDANG":
      return "~";
    case "PADAT":
      return "!";
    case "MACET":
      return "!!";
    default:
      return "C";
  }
}

export function CameraMarker({ camera, current, isHighlighted, isDimmed }: CameraMarkerProps) {
  const status = current?.traffic_status;
  const color = getCameraStatusColor(status);
  const badgeSymbol = getCameraStatusIcon(status);
  const opacity = isDimmed ? 0.35 : 1.0;
  const ringStyle = isHighlighted
    ? "box-shadow: 0 0 0 4px #c9f260, 0 4px 14px rgba(0,0,0,0.35);"
    : "box-shadow: 0 3px 10px rgba(0,0,0,0.25);";

  const customIcon = L.divIcon({
    className: "smartroad-camera-pin",
    html: `
      <div style="opacity: ${opacity}; transition: all 0.2s;" title="${camera.name}">
        <div style="
          background: ${color};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          ${ringStyle}
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 11px;
            font-weight: 800;
            font-family: monospace;
          ">${badgeSymbol}</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  return (
    <Marker position={[camera.latitude, camera.longitude]} icon={customIcon}>
      <Popup className="smartroad-popup">
        <div className="min-w-56 p-1 text-slate-800">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CCTV {camera.is_demo ? "· DEMO" : "· LIVE"}
            </span>
            {status ? (
              <StatusBadge status={status} />
            ) : (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                BELUM ADA ARUS
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm font-bold leading-snug">{camera.name}</h3>
          <p className="text-xs text-slate-500">{camera.road_name}</p>

          {current && (
            <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span>Arus kendaraan:</span>
                <span className="font-mono text-slate-900">
                  {current.vehicles_per_minute} kend./menit
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                <span>Tren:</span>
                <TrendView trend={current.trend} />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Update: {dateTime(current.timestamp)}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end">
            <Link
              href={`/cctv/${camera.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Buka Detail CCTV &rarr;
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
