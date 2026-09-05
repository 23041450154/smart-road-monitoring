"use client";

import L from "leaflet";
import { Marker, Polyline, Popup } from "react-leaflet";
import type { Route } from "@/lib/types";
import { routeLabel } from "@/lib/utils";

interface RouteLayerProps {
  routes?: Route[];
  selectedRouteId?: number | null;
  onSelectRoute?: (routeId: number) => void;
  draftPath?: [number, number][];
}

const startIcon = L.divIcon({
  className: "smartroad-endpoint-pin",
  html: `
    <div style="
      background: #0284c7;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      font-size: 16px;
    ">🏠</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const destinationIcon = L.divIcon({
  className: "smartroad-endpoint-pin",
  html: `
    <div style="
      background: #4f46e5;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      font-size: 16px;
    ">🏢</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const waypointIcon = (index: number, total: number) => {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const bg = isStart ? "#0284c7" : isEnd ? "#4f46e5" : "#f59e0b";
  const icon = isStart ? "🏠" : isEnd ? "🏢" : String(index + 1);

  return L.divIcon({
    className: "smartroad-draft-pin",
    html: `
      <div style="
        background: ${bg};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: ${isStart || isEnd ? "14px" : "11px"};
        font-weight: 800;
      ">${icon}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export function RouteLayer({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  draftPath = [],
}: RouteLayerProps) {
  return (
    <>
      {routes.map((route) => {
        const isSelected = route.id === selectedRouteId;
        const color = isSelected ? "#059669" : "#2563eb";
        const weight = isSelected ? 6 : 4;
        const opacity = isSelected ? 0.95 : 0.6;

        const startPoint = route.path[0];
        const destPoint = route.path[route.path.length - 1];

        return (
          <div key={`route-group-${route.id}`}>
            <Polyline
              positions={route.path}
              pathOptions={{ color, weight, opacity }}
              eventHandlers={{
                click: () => onSelectRoute?.(route.id),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {routeLabel(route.route_type)}
                  </span>
                  <h4 className="text-sm font-bold">{route.name}</h4>
                  <p className="text-xs text-slate-500">{route.path.length} titik koordinat</p>
                  {route.notification_time && (
                    <p className="mt-1 text-xs text-slate-600">
                      Notifikasi: {route.notification_time.slice(0, 5)} WIB
                    </p>
                  )}
                  {onSelectRoute && !isSelected && (
                    <button
                      onClick={() => onSelectRoute(route.id)}
                      className="mt-2 rounded bg-emerald-700 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      Pilih & Sorot Rute Ini
                    </button>
                  )}
                </div>
              </Popup>
            </Polyline>

            {/* Start and Destination Markers for Selected/Single Route */}
            {isSelected && startPoint && (
              <Marker position={startPoint} icon={startIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    🏠 Titik Awal ({route.name})
                    <p className="font-normal text-slate-500">
                      {startPoint[0].toFixed(5)}, {startPoint[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {isSelected && destPoint && (
              <Marker position={destPoint} icon={destinationIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    🏢 Titik Tujuan ({route.name})
                    <p className="font-normal text-slate-500">
                      {destPoint[0].toFixed(5)}, {destPoint[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}

      {/* Draft Route while drawing */}
      {draftPath.length > 1 && (
        <Polyline
          positions={draftPath}
          pathOptions={{ color: "#f97316", weight: 5, dashArray: "8 8", opacity: 0.9 }}
        />
      )}

      {draftPath.map((point, index) => (
        <Marker
          key={`draft-point-${index}`}
          position={point}
          icon={waypointIcon(index, draftPath.length)}
        />
      ))}
    </>
  );
}
