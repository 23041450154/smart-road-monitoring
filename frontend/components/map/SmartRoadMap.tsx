"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Camera, Pothole, Route, TrafficCurrent } from "@/lib/types";
import { PALEMBANG_CENTER, PALEMBANG_DEFAULT_ZOOM, calculateBounds } from "@/lib/map-utils";
import { CameraMarker } from "./CameraMarker";
import { PotholeMarker } from "./PotholeMarker";
import { RouteLayer } from "./RouteLayer";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";

export interface SmartRoadMapProps {
  cameras?: Camera[];
  potholes?: Pothole[];
  routes?: Route[];
  traffic?: TrafficCurrent[];
  selectedRouteId?: number | null;
  onSelectRoute?: (routeId: number) => void;
  draftPath?: [number, number][];
  onMapClick?: (point: [number, number]) => void;
  showControls?: boolean;
  showLegend?: boolean;
  showCctvLayer?: boolean;
  showPotholeLayer?: boolean;
  showRouteLayer?: boolean;
  filterTraffic?: string; // "all" | "LANCAR" | "SEDANG" | "PADAT" | "MACET"
  filterPothole?: string; // "all" | "active" | "repaired" | "unverified"
  dimUnrelated?: boolean;
  nearbyCameraIds?: number[];
  nearbyPotholeIds?: number[];
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
}

function ClickCapture({ onClick }: { onClick?: (point: [number, number]) => void }) {
  useMapEvents({
    click: (event) => onClick?.([event.latlng.lat, event.latlng.lng]),
  });
  return null;
}

export default function SmartRoadMap({
  cameras = [],
  potholes = [],
  routes = [],
  traffic = [],
  selectedRouteId,
  onSelectRoute,
  draftPath = [],
  onMapClick,
  showControls = true,
  showLegend = true,
  showCctvLayer = true,
  showPotholeLayer = true,
  showRouteLayer = true,
  filterTraffic = "all",
  filterPothole = "all",
  dimUnrelated = false,
  nearbyCameraIds = [],
  nearbyPotholeIds = [],
  initialCenter = PALEMBANG_CENTER,
  initialZoom = PALEMBANG_DEFAULT_ZOOM,
  className = "z-0 h-full w-full",
}: SmartRoadMapProps) {
  // Find selected route and compute bounds
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId),
    [routes, selectedRouteId]
  );

  const selectedRouteBounds = useMemo(() => {
    if (selectedRoute && selectedRoute.path.length > 0) {
      return calculateBounds(selectedRoute.path);
    }
    if (draftPath.length > 0) {
      return calculateBounds(draftPath);
    }
    return null;
  }, [selectedRoute, draftPath]);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    if (!showCctvLayer) return [];
    return cameras.filter((cam) => {
      if (filterTraffic === "all") return true;
      const current = traffic.find((t) => t.camera_id === cam.id);
      return current?.traffic_status === filterTraffic;
    });
  }, [cameras, traffic, showCctvLayer, filterTraffic]);

  // Filter potholes
  const filteredPotholes = useMemo(() => {
    if (!showPotholeLayer) return [];
    return potholes.filter((p) => {
      // Must have valid coordinates
      if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return false;
      if (isNaN(p.latitude) || isNaN(p.longitude)) return false;
      if (filterPothole === "all") return true;
      return p.status === filterPothole;
    });
  }, [potholes, showPotholeLayer, filterPothole]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className={className}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <ClickCapture onClick={onMapClick} />

        {/* User Routes */}
        {showRouteLayer && (
          <RouteLayer
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={onSelectRoute}
            draftPath={draftPath}
          />
        )}

        {/* CCTV Camera Markers */}
        {showCctvLayer &&
          filteredCameras.map((camera) => {
            const current = traffic.find((item) => item.camera_id === camera.id);
            const isNear = nearbyCameraIds.includes(camera.id);
            const isDimmed = dimUnrelated && selectedRouteId && !isNear;

            return (
              <CameraMarker
                key={`camera-${camera.id}`}
                camera={camera}
                current={current}
                isHighlighted={isNear}
                isDimmed={!!isDimmed}
              />
            );
          })}

        {/* Pothole Markers */}
        {showPotholeLayer &&
          filteredPotholes.map((pothole) => {
            const isNear = nearbyPotholeIds.includes(pothole.id);
            const isDimmed = dimUnrelated && selectedRouteId && !isNear;

            return (
              <PotholeMarker
                key={`pothole-${pothole.id}`}
                pothole={pothole}
                isHighlighted={isNear}
                isDimmed={!!isDimmed}
              />
            );
          })}

        {/* On-Map Controls */}
        {showControls && <MapControls selectedRouteBounds={selectedRouteBounds} />}
      </MapContainer>

      {/* On-Map Legend */}
      {showLegend && <MapLegend />}
    </div>
  );
}
