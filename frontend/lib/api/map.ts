import { fetcher, mutateApi } from "@/lib/api";
import type { Briefing, Camera, Pothole, Route, RouteTraffic, TrafficCurrent } from "@/lib/types";

export interface RouteInput {
  user_id: number;
  name: string;
  route_type: Route["route_type"];
  start_latitude: number;
  start_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  path: [number, number][];
  notification_time?: string | null;
  is_active?: boolean;
}

export async function getCameras(): Promise<Camera[]> {
  return fetcher<Camera[]>("/api/cameras");
}

export async function getCurrentTraffic(): Promise<TrafficCurrent[]> {
  return fetcher<TrafficCurrent[]>("/api/traffic/current");
}

export async function getCameraTraffic(cameraId: number): Promise<TrafficCurrent> {
  return fetcher<TrafficCurrent>(`/api/cameras/${cameraId}/traffic/current`);
}

export async function getPotholes(): Promise<Pothole[]> {
  return fetcher<Pothole[]>("/api/potholes");
}

export async function getRoutes(): Promise<Route[]> {
  return fetcher<Route[]>("/api/routes");
}

export async function getRoute(routeId: number): Promise<Route> {
  return fetcher<Route>(`/api/routes/${routeId}`);
}

export async function getRouteTraffic(routeId: number): Promise<RouteTraffic> {
  return fetcher<RouteTraffic>(`/api/routes/${routeId}/traffic`);
}

export async function getRoutePotholes(routeId: number): Promise<Pothole[]> {
  return fetcher<Pothole[]>(`/api/routes/${routeId}/potholes`);
}

export async function getRouteBriefing(routeId: number): Promise<Briefing> {
  return fetcher<Briefing>(`/api/routes/${routeId}/briefing`);
}

export async function createRoute(input: RouteInput): Promise<Route> {
  return mutateApi<Route>("/api/routes", "POST", input);
}

export async function updateRoute(routeId: number, input: RouteInput): Promise<Route> {
  return mutateApi<Route>(`/api/routes/${routeId}`, "PUT", input);
}

export async function deleteRoute(routeId: number): Promise<void> {
  return mutateApi<void>(`/api/routes/${routeId}`, "DELETE");
}
