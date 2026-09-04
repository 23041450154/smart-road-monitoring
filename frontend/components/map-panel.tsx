"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MapCanvas from "./map-canvas";

const Map = dynamic(() => import("./map-canvas"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

export function MapPanel(props: ComponentProps<typeof MapCanvas>) {
  return <Map {...props} />;
}
