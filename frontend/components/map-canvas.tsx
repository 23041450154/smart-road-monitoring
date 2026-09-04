"use client";

import L from "leaflet";
import Link from "next/link";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { Camera, Pothole, Route } from "@/lib/types";
import { dateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import type { TrafficCurrent } from "@/lib/types";

type Props = {
  cameras?: Camera[];
  potholes?: Pothole[];
  routes?: Route[];
  traffic?: TrafficCurrent[];
  draftPath?: [number, number][];
  onMapClick?: (point: [number, number]) => void;
};

const icon = (color: string, label: string) => L.divIcon({
  className: "map-pin",
  html: `<span style="background:${color}"><i>${label}</i></span>`,
  iconSize: [34, 34], iconAnchor: [17, 31], popupAnchor: [0, -30],
});

function ClickCapture({ onClick }: { onClick?: (point: [number, number]) => void }) {
  useMapEvents({ click: event => onClick?.([event.latlng.lat, event.latlng.lng]) });
  return null;
}

export default function MapCanvas({ cameras = [], potholes = [], routes = [], traffic = [], draftPath = [], onMapClick }: Props) {
  return <MapContainer center={[-2.981, 104.748]} zoom={13} scrollWheelZoom className="z-0">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <ClickCapture onClick={onMapClick} />
    {cameras.map(camera => {
      const current = traffic.find(item => item.camera_id === camera.id);
      return <Marker key={`c-${camera.id}`} position={[camera.latitude, camera.longitude]} icon={icon("#123c33", "C")}><Popup><div className="min-w-48"><b>{camera.name}</b><p className="my-1 text-xs">{camera.road_name}</p>{current && <><StatusBadge status={current.traffic_status} /><p className="mt-2 text-[11px]">{current.vehicles_per_minute} kend./menit<br />{dateTime(current.timestamp)}</p></>}<Link className="mt-2 block text-xs font-bold underline" href={`/cctv/${camera.id}`}>Buka CCTV</Link></div></Popup></Marker>;
    })}
    {potholes.map(pothole => <Marker key={`p-${pothole.id}`} position={[pothole.latitude, pothole.longitude]} icon={icon("#ff7849", "!")}><Popup><div className="min-w-44"><b>Jalan berlubang</b><p className="my-1 text-xs">{pothole.road_name ?? "Nama jalan belum tersedia"}</p><p className="text-[11px]">Confidence {Math.round(pothole.confidence * 100)}% · {pothole.severity}<br />{dateTime(pothole.detected_at)}</p></div></Popup></Marker>)}
    {routes.map(route => <Polyline key={`r-${route.id}`} positions={route.path} pathOptions={{ color: "#376aff", weight: 5, opacity: .78 }} />)}
    {draftPath.length > 1 && <Polyline positions={draftPath} pathOptions={{ color: "#df5b31", weight: 5, dashArray: "8 8" }} />}
    {draftPath.map((point, index) => <Marker key={`d-${index}`} position={point} icon={icon(index === 0 ? "#376aff" : index === draftPath.length - 1 ? "#df5b31" : "#ffb84d", String(index + 1))} />)}
  </MapContainer>;
}
