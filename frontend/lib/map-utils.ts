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
