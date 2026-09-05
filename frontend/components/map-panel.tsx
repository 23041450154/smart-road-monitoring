"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type SmartRoadMap from "./map/SmartRoadMap";

const Map = dynamic(() => import("./map/SmartRoadMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center bg-slate-100 text-slate-500">
      <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600" />
      <p className="mt-3 text-xs font-bold">Memuat data peta...</p>
    </div>
  ),
});

export function MapPanel(props: ComponentProps<typeof SmartRoadMap>) {
  return <Map {...props} />;
}

