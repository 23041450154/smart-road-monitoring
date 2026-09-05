"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Locate, MapPin, Maximize2 } from "lucide-react";
import L from "leaflet";
import { PALEMBANG_CENTER, PALEMBANG_DEFAULT_ZOOM } from "@/lib/map-utils";

interface MapControlsProps {
  selectedRouteBounds?: [[number, number], [number, number]] | null;
}

export function MapControls({ selectedRouteBounds }: MapControlsProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [userLocationMarker, setUserLocationMarker] = useState<L.Marker | null>(null);

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

  const handleUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokasi browser tidak didukung pada perangkat ini.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 15, { animate: true });

        // Add or move current position pin
        if (userLocationMarker) {
          userLocationMarker.setLatLng([lat, lng]);
        } else {
          const userPin = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "smartroad-user-pin",
              html: `
                <div style="
                  background: #3b82f6;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
                "></div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
          })
            .addTo(map)
            .bindPopup("<b>Lokasi Anda Saat Ini</b>");
          setUserLocationMarker(userPin);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Izin akses lokasi ditolak oleh peramban Anda.");
        } else {
          alert("Tidak dapat mengambil lokasi saat ini.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={handleResetToPalembang}
        className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-md backdrop-blur hover:bg-slate-50 transition"
        title="Pusatkan peta ke Kota Palembang"
      >
        <MapPin size={14} className="text-emerald-700" />
        <span className="hidden sm:inline">Pusat Palembang</span>
      </button>

      {selectedRouteBounds && (
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition"
          title="Fokuskan ke rute terpilih"
        >
          <Maximize2 size={14} />
          <span className="hidden sm:inline">Fokus Rute</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleUserLocation}
        disabled={locating}
        className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-md backdrop-blur hover:bg-slate-50 transition disabled:opacity-50"
        title="Tampilkan lokasi saya saat ini"
      >
        {locating ? (
          <Crosshair size={14} className="animate-spin text-blue-600" />
        ) : (
          <Locate size={14} className="text-blue-600" />
        )}
        <span className="hidden sm:inline">
          {locating ? "Mencari..." : "Lokasi Saya"}
        </span>
      </button>
    </div>
  );
}
