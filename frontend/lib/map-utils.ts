/**
 * Coordinate and map geometry utilities for Smart Road Monitoring.
 *
 * Explicit Orientation Rules:
 * - GeoJSON standard uses [longitude, latitude].
 * - Leaflet Map standard uses [latitude, longitude].
 */

export type LatLngTuple = [number, number]; // [lat, lng]
export type GeoJsonCoord = [number, number]; // [lng, lat]

/**
 * Converts GeoJSON [longitude, latitude] to Leaflet [latitude, longitude].
 */
export function geoJsonToLeafletLatLng(coordinates: GeoJsonCoord): LatLngTuple {
  const [lng, lat] = coordinates;
  return [lat, lng];
}

/**
 * Converts Leaflet [latitude, longitude] to GeoJSON [longitude, latitude].
 */
export function leafletToGeoJsonLatLng(coordinates: LatLngTuple): GeoJsonCoord {
  const [lat, lng] = coordinates;
  return [lng, lat];
}

/**
 * Converts an array of GeoJSON coordinates into Leaflet LatLng tuples.
 */
export function geoJsonPathToLeaflet(path: GeoJsonCoord[]): LatLngTuple[] {
  return path.map(geoJsonToLeafletLatLng);
}

/**
 * Converts an array of Leaflet LatLng tuples into GeoJSON coordinates.
 */
export function leafletPathToGeoJson(path: LatLngTuple[]): GeoJsonCoord[] {
  return path.map(leafletToGeoJsonLatLng);
}

/**
 * Default initial map center for Palembang City, South Sumatra, Indonesia.
 * Note: Used solely for map viewport initialization; never treated as user GPS.
 */
export const PALEMBANG_CENTER: LatLngTuple = [-2.981, 104.748];
export const PALEMBANG_DEFAULT_ZOOM = 13;

/**
 * Computes bounding box for Leaflet from a list of [lat, lng] points.
 */
export function calculateBounds(points: LatLngTuple[]): [LatLngTuple, LatLngTuple] | null {
  if (!points.length) return null;
  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  for (let i = 1; i < points.length; i++) {
    const [lat, lng] = points[i];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

const SAVED_USER_LOCATION_KEY = "laju_saved_user_location_v1";

export interface SavedUserLocation {
  lat: number;
  lng: number;
  label?: string;
  updatedAt: number;
}

export function getSavedUserLocation(): SavedUserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVED_USER_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedUserLocation;
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveUserLocation(lat: number, lng: number, label?: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedUserLocation = {
      lat,
      lng,
      label,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(SAVED_USER_LOCATION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export function clearSavedUserLocation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVED_USER_LOCATION_KEY);
  } catch {
    // ignore
  }
}

export function distanceMeters(a: LatLngTuple, b: LatLngTuple): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface DeviceLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  source: "gps" | "calibrated" | "coarse_ip";
  savedLabel?: string;
}

/**
 * Reads high-accuracy device location using multi-sample watchPosition.
 * On desktop/Brave browsers without hardware GPS or Wi-Fi location services,
 * browsers fall back to ISP GeoIP (accuracy > 1,000m, e.g. Ogan Ilir/Parit).
 * When coarse IP location is detected, this automatically uses the user's
 * calibrated location if available, or flags source="coarse_ip" so the UI
 * can prompt a 1-click pin calibration in Palembang.
 */
export function requestAccurateDeviceLocation(options?: {
  ignoreSaved?: boolean;
}): Promise<DeviceLocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("UNSUPPORTED"));
      return;
    }

    let bestPos: GeolocationPosition | null = null;
    let settled = false;
    let watchId = -1;

    const finish = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      if (watchId !== -1) {
        navigator.geolocation.clearWatch(watchId);
      }

      const acc = Math.round(pos.coords.accuracy || 9999);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const distFromPalembang = distanceMeters([lat, lng], PALEMBANG_CENTER);

      // If accuracy > 1000m or browser placed user > 20km away with poor accuracy (> 500m),
      // it is an ISP GeoIP fallback (common on Linux desktop / Brave).
      const isCoarseIp = acc > 1000 || (distFromPalembang > 20000 && acc > 400);

      if (isCoarseIp && !options?.ignoreSaved) {
        const saved = getSavedUserLocation();
        if (saved) {
          resolve({
            lat: saved.lat,
            lng: saved.lng,
            accuracy: 15,
            source: "calibrated",
            savedLabel: saved.label,
          });
          return;
        }
      }

      resolve({
        lat,
        lng,
        accuracy: acc,
        source: isCoarseIp ? "coarse_ip" : "gps",
      });
    };

    const settleTimer = setTimeout(() => {
      if (bestPos) {
        finish(bestPos);
      }
    }, 2400);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
        // If we get an accurate GPS/Wi-Fi lock (<= 100m), finish right away
        if (pos.coords.accuracy <= 100) {
          clearTimeout(settleTimer);
          finish(pos);
        }
      },
      (err) => {
        clearTimeout(settleTimer);
        if (bestPos) {
          finish(bestPos);
          return;
        }
        if (settled) return;
        settled = true;
        if (watchId !== -1) {
          navigator.geolocation.clearWatch(watchId);
        }
        // If browser geolocation failed completely, check if user has calibrated location
        const saved = getSavedUserLocation();
        if (saved && !options?.ignoreSaved) {
          resolve({
            lat: saved.lat,
            lng: saved.lng,
            accuracy: 15,
            source: "calibrated",
            savedLabel: saved.label,
          });
          return;
        }
        reject(err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );
  });
}
