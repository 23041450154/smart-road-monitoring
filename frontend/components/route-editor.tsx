"use client";

import {
  ArrowRight,
  ArrowUpDown,
  Clock,
  LocateFixed,
  Loader2,
  Navigation,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { fetcher, mutateApi } from "@/lib/api";
import type { Camera, Pothole, Route, TrafficCurrent } from "@/lib/types";
import { MapPanel } from "./map-panel";

interface PlaceSuggestion {
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
}

interface RouteOption {
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
  streets: string[];
  summary: string;
}

const PALEMBANG_LANDMARKS: PlaceSuggestion[] = [
  { label: "Jembatan Ampera", sublabel: "Jl. Jenderal Sudirman, Pusat Kota", lat: -2.9916, lng: 104.7635 },
  { label: "Simpang Charitas", sublabel: "Jl. Jenderal Sudirman / Jl. Kapten A. Rivai", lat: -2.9765, lng: 104.7524 },
  { label: "Simpang Polda Sumsel", sublabel: "Jl. Jenderal Sudirman / Jl. Basuki Rahmat", lat: -2.9571, lng: 104.7429 },
  { label: "Jl. Demang Lebar Daun", sublabel: "Ilir Barat I, Palembang", lat: -2.9689, lng: 104.7285 },
  { label: "Simpang Angkatan 45 / PS Mall", sublabel: "Jl. Angkatan 45 / Jl. POM IX", lat: -2.9766, lng: 104.7421 },
  { label: "PTC Mall / Jl. R. Sukamto", sublabel: "Jl. R. Sukamto, 8 Ilir, Kemuning", lat: -2.9519, lng: 104.7592 },
  { label: "Simpang Patal Pusri", sublabel: "Jl. R. Sukamto / Jl. MP. Mangkunegara", lat: -2.9462, lng: 104.7628 },
  { label: "Universitas Sriwijaya (Bukit Besar)", sublabel: "Jl. Srijaya Negara, Bukit Lama", lat: -2.9854, lng: 104.7324 },
  { label: "Kambang Iwak Park", sublabel: "Jl. Tasik, Talang Semut", lat: -2.9901, lng: 104.7478 },
  { label: "Jakabaring Sport City", sublabel: "Jl. Gubernur H. A. Bastari, Jakabaring", lat: -3.0189, lng: 104.7905 },
  { label: "Jl. Ahmad Yani (Seberang Ulu)", sublabel: "Seberang Ulu I / Plaju", lat: -2.9985, lng: 104.7778 },
  { label: "Bandara Sultan Mahmud Badaruddin II", sublabel: "Jl. Tanjung Api-Api, Sukarami", lat: -2.9003, lng: 104.7013 },
  { label: "Simpang Tanjung Api-Api (KM 9)", sublabel: "Jl. Kol. H. Burlian, Karya Baru", lat: -2.9332, lng: 104.7161 },
  { label: "Terminal Alang-Alang Lebar (KM 12)", sublabel: "Jl. Bypass Alang-Alang Lebar", lat: -2.9225, lng: 104.6821 },
  { label: "Stasiun Kertapati", sublabel: "Jl. Ki Merogan, Kertapati", lat: -3.0226, lng: 104.7453 },
  { label: "Plaju / Universitas Muhammadiyah", sublabel: "Jl. Jenderal Ahmad Yani, Plaju", lat: -2.9968, lng: 104.7892 },
];

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function minDistanceToPathMeters(point: [number, number], path: [number, number][]): number {
  if (!path.length) return Infinity;
  let min = Infinity;
  for (const p of path) {
    const d = haversineMeters(point, p);
    if (d < min) min = d;
  }
  return min;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { headers: { "Accept-Language": "id" } }
    );
    if (!res.ok) throw new Error("reverse failed");
    const data = await res.json();
    const addr = data.address || {};
    const primary =
      addr.road ||
      addr.amenity ||
      addr.building ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.village;
    const secondary = addr.suburb || addr.city_district || addr.city || "Palembang";
    if (primary) {
      return primary === secondary ? primary : `${primary}, ${secondary}`;
    }
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 2).join(",").trim();
    }
  } catch {
    // fallback to coordinates
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function RouteEditor({
  route,
  onCancel,
}: {
  route?: Route;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { user, role } = useAuth();
  const [name, setName] = useState(route?.name ?? "Rute Berangkat");
  const [routeType, setRouteType] = useState<Route["route_type"]>(
    route?.route_type ?? "commute_to_work",
  );
  const [notifyTime, setNotifyTime] = useState(
    route?.notification_time?.slice(0, 5) ?? "06:45",
  );

  // Origin & Destination state
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(
    route?.path?.length ? route.path[0] : null
  );
  const [destPoint, setDestPoint] = useState<[number, number] | null>(
    route?.path && route.path.length > 1 ? route.path[route.path.length - 1] : null
  );
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<"origin" | "dest" | null>(null);
  const [remoteSuggestions, setRemoteSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [locatingTarget, setLocatingTarget] = useState<"origin" | "dest" | null>(null);

  // Computed road routes from OSRM
  const [path, setPath] = useState<[number, number][]>(route?.path ?? []);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [routingLoading, setRoutingLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load cameras & traffic so user sees CCTV passed along the route
  const { data: cameras } = useSWR<Camera[]>("/api/cameras", fetcher);
  const { data: traffic } = useSWR<TrafficCurrent[]>("/api/traffic/current", fetcher);
  const { data: potholes } = useSWR<Pothole[]>("/api/potholes", fetcher);

  // Reverse geocode existing route endpoints on mount
  useEffect(() => {
    if (route?.path && route.path.length >= 2) {
      const start = route.path[0];
      const end = route.path[route.path.length - 1];
      reverseGeocode(start[0], start[1]).then((label) => setOriginQuery(label));
      reverseGeocode(end[0], end[1]).then((label) => setDestQuery(label));
    }
  }, [route]);

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setActiveSearch(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const localMatches = useMemo(() => {
    if (!activeSearch) return [];
    const rawQuery = (activeSearch === "origin" ? originQuery : destQuery).trim();
    if (!rawQuery) return PALEMBANG_LANDMARKS.slice(0, 6);
    const qLower = rawQuery.toLowerCase();
    return PALEMBANG_LANDMARKS.filter(
      (item) =>
        item.label.toLowerCase().includes(qLower) ||
        item.sublabel.toLowerCase().includes(qLower)
    ).slice(0, 4);
  }, [activeSearch, originQuery, destQuery]);

  const suggestions = useMemo(() => {
    const rawQuery = (activeSearch === "origin" ? originQuery : destQuery).trim();
    if (!rawQuery || rawQuery.length < 2) return localMatches;
    const merged = [...localMatches];
    for (const rem of remoteSuggestions) {
      const exists = merged.some(
        (m) => haversineMeters([m.lat, m.lng], [rem.lat, rem.lng]) < 80
      );
      if (!exists) merged.push(rem);
    }
    return merged.slice(0, 6);
  }, [activeSearch, originQuery, destQuery, localMatches, remoteSuggestions]);

  // Search places via OpenStreetMap Nominatim
  useEffect(() => {
    if (!activeSearch) return;
    const rawQuery = (activeSearch === "origin" ? originQuery : destQuery).trim();
    if (rawQuery.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const searchQ = rawQuery.toLowerCase().includes("palembang")
          ? rawQuery
          : `${rawQuery}, Palembang`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQ
          )}&countrycodes=id&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "id" } }
        );
        if (res.ok && !cancelled) {
          const data: Array<{
            display_name: string;
            lat: string;
            lon: string;
            name?: string;
            address?: Record<string, string>;
          }> = await res.json();
          const remoteItems: PlaceSuggestion[] = data.map((item) => {
            const parts = item.display_name.split(",").map((s) => s.trim());
            const label = item.name || parts[0] || "Lokasi Palembang";
            const sublabel = parts.slice(1, 4).join(", ") || "Palembang";
            return {
              label,
              sublabel,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            };
          });
          setRemoteSuggestions(remoteItems);
        }
      } catch {
        // Keep local matches if offline/rate-limited
      } finally {
        if (!cancelled) setSearchingPlaces(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [originQuery, destQuery, activeSearch]);

  // Calculate real road route via OSRM whenever both originPoint & destPoint are set
  useEffect(() => {
    if (!originPoint || !destPoint) return;
    let cancelled = false;
    const start = originPoint;
    const end = destPoint;

    const timer = setTimeout(async () => {
      setRoutingLoading(true);
      setError("");
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM error");
        const data = await res.json();
        if (!data.routes || !data.routes.length) {
          throw new Error("No route found");
        }
        if (cancelled) return;

        const options: RouteOption[] = data.routes.slice(0, 3).map(
          (r: {
            geometry: { coordinates: [number, number][] };
            distance: number;
            duration: number;
            legs?: Array<{ steps?: Array<{ name?: string; ref?: string }> }>;
          }) => {
            const coords: [number, number][] = r.geometry.coordinates.map(
              ([lng, lat]) => [lat, lng]
            );
            const streets: string[] = [];
            for (const leg of r.legs ?? []) {
              for (const step of leg.steps ?? []) {
                const streetName = (step.name || step.ref || "").trim();
                if (
                  streetName &&
                  streetName.length > 1 &&
                  streets[streets.length - 1] !== streetName
                ) {
                  streets.push(streetName);
                }
              }
            }
            return {
              path: coords,
              distanceKm: Number((r.distance / 1000).toFixed(1)),
              durationMin: Math.max(1, Math.round(r.duration / 60)),
              streets,
              summary: streets.slice(0, 3).join(" → ") || "Jalur Utama Kota",
            };
          }
        );

        setRouteOptions(options);
        setSelectedOptionIdx(0);
        setPath(options[0].path);
      } catch {
        if (cancelled) return;
        const distKm = Number((haversineMeters(start, end) / 1000).toFixed(1));
        const fallback: RouteOption = {
          path: [start, end],
          distanceKm: distKm,
          durationMin: Math.max(1, Math.round(distKm * 2.5)),
          streets: [],
          summary: "Jalur Langsung",
        };
        setRouteOptions([fallback]);
        setSelectedOptionIdx(0);
        setPath([start, end]);
      } finally {
        if (!cancelled) setRoutingLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [originPoint, destPoint]);

  // Select suggestion from dropdown
  function handleSelectPlace(place: PlaceSuggestion) {
    const coords: [number, number] = [place.lat, place.lng];
    if (activeSearch === "origin") {
      setOriginPoint(coords);
      setOriginQuery(place.label);
    } else if (activeSearch === "dest") {
      setDestPoint(coords);
      setDestQuery(place.label);
    }
    setActiveSearch(null);
  }

  // Use Device GPS Location
  function handleUseDeviceLocation(target: "origin" | "dest") {
    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung fitur pembacaan lokasi perangkat (GPS).");
      return;
    }
    setLocatingTarget(target);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords: [number, number] = [lat, lng];
        const streetLabel = await reverseGeocode(lat, lng);
        if (target === "origin") {
          setOriginPoint(coords);
          setOriginQuery(`Lokasi Saya (${streetLabel})`);
        } else {
          setDestPoint(coords);
          setDestQuery(`Lokasi Saya (${streetLabel})`);
        }
        setLocatingTarget(null);
        setActiveSearch(null);
      },
      (err) => {
        setLocatingTarget(null);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.");
        } else {
          setError("Gagal membaca lokasi perangkat. Pastikan GPS aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Swap Origin & Destination
  function handleSwapPoints() {
    const tempPoint = originPoint;
    const tempQuery = originQuery;
    setOriginPoint(destPoint);
    setOriginQuery(destQuery);
    setDestPoint(tempPoint);
    setDestQuery(tempQuery);
  }

  // Click on map sets Origin first, then Destination
  async function handleMapClick(point: [number, number]) {
    if (!originPoint || (originPoint && destPoint)) {
      setOriginPoint(point);
      setDestPoint(null);
      setDestQuery("");
      setRouteOptions([]);
      setPath([point]);
      const label = await reverseGeocode(point[0], point[1]);
      setOriginQuery(label);
    } else {
      setDestPoint(point);
      const label = await reverseGeocode(point[0], point[1]);
      setDestQuery(label);
    }
  }

  function handleResetRoute() {
    setOriginPoint(null);
    setDestPoint(null);
    setOriginQuery("");
    setDestQuery("");
    setRouteOptions([]);
    setPath([]);
    setError("");
  }

  const activeRouteOption = routeOptions[selectedOptionIdx] ?? null;

  // Cameras & potholes passed along the selected route (within 500m / 100m)
  const nearbyCameraIds = useMemo(() => {
    if (!cameras || path.length < 2) return [];
    return cameras
      .filter((c) => minDistanceToPathMeters([c.latitude, c.longitude], path) <= 500)
      .map((c) => c.id);
  }, [cameras, path]);

  const nearbyCameras = useMemo(() => {
    if (!cameras) return [];
    return cameras.filter((c) => nearbyCameraIds.includes(c.id));
  }, [cameras, nearbyCameraIds]);

  const nearbyPotholeIds = useMemo(() => {
    if (!potholes || path.length < 2) return [];
    return potholes
      .filter((p) => minDistanceToPathMeters([p.latitude, p.longitude], path) <= 100)
      .map((p) => p.id);
  }, [potholes, path]);

  async function save() {
    if (role === "guest") {
      router.push("/login");
      return;
    }
    if (path.length < 2) {
      return setError("Tentukan Titik Awal dan Titik Tujuan terlebih dahulu.");
    }
    setSaving(true);
    setError("");
    const body = {
      user_id: route?.user_id ?? user?.id ?? 1,
      name: name.trim() || "Rute Perjalanan",
      route_type: routeType,
      start_latitude: path[0][0],
      start_longitude: path[0][1],
      destination_latitude: path.at(-1)![0],
      destination_longitude: path.at(-1)![1],
      path,
      notification_time: notifyTime || null,
      is_active: true,
    };
    try {
      const saved = await mutateApi<Route>(
        route ? `/api/routes/${route.id}` : "/api/routes",
        route ? "PUT" : "POST",
        body,
      );
      router.push(`/routes/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan rute");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
      <div className="grid lg:grid-cols-[400px_1fr]">
        {/* Left Panel: Google Maps Style Route Planner */}
        <div className="border-b border-zinc-100 p-5 lg:border-b-0 lg:border-r flex flex-col justify-between max-h-[760px] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {route ? "Edit Rute Perjalanan" : "Perencana Rute Pintar"}
              </span>
              {(originPoint || destPoint) && (
                <button
                  type="button"
                  onClick={handleResetRoute}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Reset Titik</span>
                </button>
              )}
            </div>

            {/* Google Maps Style Origin & Destination Search Box */}
            <div ref={searchContainerRef} className="relative space-y-2.5">
              {/* Origin Input */}
              <div className="relative">
                <label className="text-[11px] font-medium text-zinc-500 mb-1 flex items-center justify-between">
                  <span>Titik Awal (Keberangkatan)</span>
                  <button
                    type="button"
                    onClick={() => handleUseDeviceLocation("origin")}
                    disabled={locatingTarget !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {locatingTarget === "origin" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <LocateFixed size={11} />
                    )}
                    <span>Gunakan Lokasi Saya</span>
                  </button>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 size-2.5 rounded-full bg-sky-600 ring-3 ring-sky-100" />
                  <input
                    type="text"
                    value={originQuery}
                    onFocus={() => setActiveSearch("origin")}
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setActiveSearch("origin");
                    }}
                    placeholder="Cari nama jalan / tempat asal, atau klik peta..."
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-8 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  {originQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setOriginQuery("");
                        setOriginPoint(null);
                        setRouteOptions([]);
                        setPath(destPoint ? [destPoint] : []);
                        setActiveSearch("origin");
                      }}
                      className="absolute right-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Swap Button Divider */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-400">
                  Pilih dari daftar pencarian atau klik langsung di peta
                </span>
                <button
                  type="button"
                  onClick={handleSwapPoints}
                  disabled={!originPoint && !destPoint}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
                  title="Tukar titik awal dan tujuan"
                >
                  <ArrowUpDown size={12} />
                  <span>Tukar</span>
                </button>
              </div>

              {/* Destination Input */}
              <div className="relative">
                <label className="text-[11px] font-medium text-zinc-500 mb-1 flex items-center justify-between">
                  <span>Titik Tujuan (Destinasi)</span>
                  <button
                    type="button"
                    onClick={() => handleUseDeviceLocation("dest")}
                    disabled={locatingTarget !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {locatingTarget === "dest" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <LocateFixed size={11} />
                    )}
                    <span>Lokasi Saya</span>
                  </button>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 size-2.5 rounded-full bg-indigo-600 ring-3 ring-indigo-100" />
                  <input
                    type="text"
                    value={destQuery}
                    onFocus={() => setActiveSearch("dest")}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setActiveSearch("dest");
                    }}
                    placeholder="Cari nama jalan / tujuan (mis. Jembatan Ampera)..."
                    className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-8 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  {destQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestQuery("");
                        setDestPoint(null);
                        setRouteOptions([]);
                        setPath(originPoint ? [originPoint] : []);
                        setActiveSearch("dest");
                      }}
                      className="absolute right-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Autocomplete Suggestions Dropdown */}
              {activeSearch && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg">
                  <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span>
                      {activeSearch === "origin"
                        ? "Pilih Titik Awal"
                        : "Pilih Titik Tujuan"}
                    </span>
                    {searchingPlaces && (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Loader2 size={10} className="animate-spin" />
                        Mencari jalan...
                      </span>
                    )}
                  </div>

                  {suggestions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-zinc-400 text-center">
                      Tidak ditemukan hasil. Coba ketik nama jalan lain atau klik peta.
                    </div>
                  ) : (
                    suggestions.map((item, idx) => (
                      <button
                        key={`${item.label}-${idx}`}
                        type="button"
                        onClick={() => handleSelectPlace(item)}
                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <Search size={13} className="mt-0.5 shrink-0 text-zinc-400" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-900 truncate">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {item.sublabel}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Route Calculation Status & Traversed Streets ("Rute yang Dilalui") */}
            {routingLoading && (
              <div className="flex items-center gap-2 py-2 text-xs text-blue-600 font-medium">
                <Loader2 size={14} className="animate-spin" />
                <span>Menghitung jalur jalan raya terbaik...</span>
              </div>
            )}

            {!routingLoading && activeRouteOption && (
              <div className="border-t border-b border-zinc-100 py-3.5 space-y-3">
                {/* Alternative Route Tabs if OSRM returns multiple routes */}
                {routeOptions.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {routeOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedOptionIdx(idx);
                          setPath(opt.path);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 ${
                          selectedOptionIdx === idx
                            ? "bg-blue-600 text-white"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        Rute {idx + 1} ({opt.durationMin} mnt · {opt.distanceKm} km)
                      </button>
                    ))}
                  </div>
                )}

                {/* Distance & Duration Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-blue-600" />
                    <span className="text-sm font-bold text-zinc-900">
                      {activeRouteOption.distanceKm} km
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <Clock size={12} />
                      ~{activeRouteOption.durationMin} menit
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {nearbyCameras.length} CCTV terpantau
                  </span>
                </div>

                {/* Daftar Jalan yang Dilalui */}
                {activeRouteOption.streets.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                      Rute Jalan yang Dilalui
                    </span>
                    <div className="flex flex-wrap items-center gap-y-1 text-xs text-zinc-700 leading-relaxed">
                      {activeRouteOption.streets.map((street, i) => (
                        <span key={`${street}-${i}`} className="inline-flex items-center">
                          <span className="font-medium text-zinc-900">{street}</span>
                          {i < activeRouteOption.streets.length - 1 && (
                            <ArrowRight size={11} className="mx-1.5 text-zinc-400 shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kamera CCTV yang Dilewati di Sepanjang Rute */}
                {nearbyCameras.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                      Titik CCTV di Sepanjang Rute Ini
                    </span>
                    <div className="space-y-1">
                      {nearbyCameras.map((cam) => {
                        const camTraffic = traffic?.find((t) => t.camera_id === cam.id);
                        return (
                          <div
                            key={cam.id}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <span className="flex items-center gap-1.5 text-zinc-700 truncate">
                              <Video size={12} className="text-blue-600 shrink-0" />
                              <span className="truncate">{cam.name}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-500 shrink-0 ml-2">
                              {camTraffic?.traffic_status ?? "AKTIF"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Route Metadata Inputs */}
            <div className="space-y-3 pt-1">
              <label className="block">
                <span className="text-xs font-medium text-zinc-700">Nama Rute</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Berangkat Ngantor / Kampus"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-700">Jenis Perjalanan</span>
                  <select
                    value={routeType}
                    onChange={(e) =>
                      setRouteType(e.target.value as Route["route_type"])
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="commute_to_work">Rute Berangkat</option>
                    <option value="commute_home">Rute Pulang</option>
                    <option value="custom">Rute Kustom</option>
                  </select>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-700">Jadwal WA</span>
                    <span className="text-[10px] text-emerald-600 font-medium">-5 mnt</span>
                  </div>
                  <input
                    type="time"
                    value={notifyTime}
                    onChange={(e) => setNotifyTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-600 pt-1">
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 flex gap-2 pt-3 border-t border-zinc-100">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                title="Batal"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || routingLoading || path.length < 2}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? "Menyimpan Rute…" : "Simpan Rute"}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Interactive Map with Live Road Polyline & CCTV Highlights */}
        <div className="h-[540px] lg:h-auto min-h-[540px]">
          <MapPanel
            draftPath={path}
            cameras={cameras}
            traffic={traffic}
            potholes={potholes}
            nearbyCameraIds={nearbyCameraIds}
            nearbyPotholeIds={nearbyPotholeIds}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}
