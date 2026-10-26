"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Locate, MapPin, Maximize2, Minimize2 } from "lucide-react";
import L from "leaflet";
import {
  PALEMBANG_CENTER,
  PALEMBANG_DEFAULT_ZOOM,
  distanceMeters,
  requestAccurateDeviceLocation,
  saveUserLocation,
} from "@/lib/map-utils";

interface MapControlsProps {
  selectedRouteBounds?: [[number, number], [number, number]] | null;
}

export function MapControls({ selectedRouteBounds }: MapControlsProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [userLocationMarker, setUserLocationMarker] = useState<L.Marker | null>(null);

  useEffect(() => {
    const onChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!selectedRouteBounds) return;
    const [[minLat, minLng], [maxLat, maxLng]] = selectedRouteBounds;
    if (Math.abs(maxLat - minLat) < 0.0005 && Math.abs(maxLng - minLng) < 0.0005) {
      map.setView([minLat, minLng], 15, { animate: true });
    } else {
      map.fitBounds(selectedRouteBounds, {
        padding: [48, 48],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [map, selectedRouteBounds]);

  const handleToggleFullscreen = () => {
    const container = map.getContainer();
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleResetToPalembang = () => {
    map.setView(PALEMBANG_CENTER, PALEMBANG_DEFAULT_ZOOM, { animate: true });
  };

  const handleFitRoute = () => {
    if (selectedRouteBounds) {
      map.fitBounds(selectedRouteBounds, {
        padding: [50, 50],
        animate: true,
      });
    }
  };

  const handleUserLocation = async () => {
    setLocating(true);
    try {
      const result = await requestAccurateDeviceLocation();
      setLocating(false);

      let lat = result.lat;
      let lng = result.lng;
      const isFarCoarse =
        result.source === "coarse_ip" &&
        distanceMeters([lat, lng], PALEMBANG_CENTER) > 20000;

      // If desktop/Brave browser returned coarse ISP IP far outside Palembang (e.g. Parit/Ogan Ilir),
      // keep viewport in Palembang and let user drag the blue pin to calibrate their exact location.
      if (isFarCoarse) {
        lat = PALEMBANG_CENTER[0];
        lng = PALEMBANG_CENTER[1];
      }

      map.setView([lat, lng], isFarCoarse ? 14 : 16, { animate: true });

      const popupHtml = isFarCoarse
        ? `<div style="font-size:12px;max-width:210px"><b>Kalibrasi Lokasi PC/Browser</b><br/><span style="color:#64748b">Browser Anda hanya mendeteksi lokasi IP ISP (±${Math.round(result.accuracy / 1000)} km). <b>Geser titik biru ini</b> ke posisi tepat Anda untuk menyimpan Lokasi Saya.</span></div>`
        : `<div style="font-size:12px;max-width:200px"><b>Lokasi Anda Saat Ini</b><br/><span style="color:#64748b">Geser titik biru ini jika ingin menyesuaikan akurasi posisi.</span></div>`;

      if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lng]);
        userLocationMarker.setPopupContent(popupHtml);
        if (isFarCoarse) userLocationMarker.openPopup();
      } else {
        const userPin = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: "smartroad-user-pin",
            html: `
              <div style="
                background: #2563eb;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.35);
                cursor: grab;
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
          .addTo(map)
          .bindPopup(popupHtml);

        userPin.on("dragend", () => {
          const pos = userPin.getLatLng();
          saveUserLocation(pos.lat, pos.lng);
          userPin
            .setPopupContent(
              `<div style="font-size:12px"><b>✓ Lokasi Saya Tersimpan</b><br/><span style="color:#64748b">${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}</span></div>`
            )
            .openPopup();
        });

        if (isFarCoarse) {
          userPin.openPopup();
        }
        setUserLocationMarker(userPin);
      }
    } catch {
      setLocating(false);
      alert("Izin lokasi ditolak atau perangkat tidak dapat membaca GPS.");
    }
  };

  return (
    <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleResetToPalembang}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur hover:bg-zinc-50 transition"
        title="Pusatkan peta ke Kota Palembang"
      >
        <MapPin size={13} className="text-zinc-600" />
        <span className="hidden sm:inline">Pusat Palembang</span>
      </button>

      {selectedRouteBounds && (
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition"
          title="Fokuskan ke rute terpilih"
        >
          <Maximize2 size={13} />
          <span className="hidden sm:inline">Fokus Rute</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleUserLocation}
        disabled={locating}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur hover:bg-zinc-50 transition disabled:opacity-50"
        title="Tampilkan lokasi saya saat ini"
      >
        {locating ? (
          <Crosshair size={13} className="animate-spin text-blue-600" />
        ) : (
          <Locate size={13} className="text-blue-600" />
        )}
        <span className="hidden sm:inline">
          {locating ? "Mencari..." : "Lokasi Saya"}
        </span>
      </button>

      <button
        type="button"
        onClick={handleToggleFullscreen}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur hover:bg-zinc-50 transition"
        title={isMapFullscreen ? "Keluar Layar Penuh Peta" : "Mode Layar Penuh Peta"}
      >
        {isMapFullscreen ? (
          <Minimize2 size={13} className="text-zinc-700" />
        ) : (
          <Maximize2 size={13} className="text-zinc-700" />
        )}
        <span className="hidden sm:inline">
          {isMapFullscreen ? "Keluar Fullscreen" : "Fullscreen Peta"}
        </span>
      </button>
    </div>
  );
}
