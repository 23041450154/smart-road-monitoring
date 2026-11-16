"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";

export function MapLegend() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute bottom-6 right-6 z-[1000] max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Ciutkan legenda peta" : "Bentangkan legenda peta"}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
          <Layers size={14} aria-hidden="true" className="text-zinc-700" />
          <span>Legenda Peta</span>
        </div>
        <span className="text-slate-600">
          {expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-2 text-[11px] text-slate-700">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-600">
              Status Lalu Lintas (CCTV)
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-emerald-500 font-bold text-white text-[10px]">
                  ✓
                </span>
                <span>LANCAR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-amber-500 font-bold text-white text-[10px]">
                  ~
                </span>
                <span>SEDANG</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-orange-500 font-bold text-white text-[10px]">
                  !
                </span>
                <span>PADAT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-red-500 font-bold text-white text-[10px]">
                  !!
                </span>
                <span>MACET</span>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-600">
              Objek Jalan & Rute
            </span>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#ea580c] font-bold text-white text-[9px]">
                  ▲
                </span>
                <span>Jalan Berlubang</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-4 rounded-full bg-emerald-600" />
                <span>Rute Terpilih</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-4 rounded-full bg-blue-600" />
                <span>Rute Tersimpan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-[10px]">
                  <span className="grid size-4 place-items-center rounded-full bg-[#0284c7] text-white">A</span>
                  <span className="grid size-4 place-items-center rounded-full bg-[#4f46e5] text-white">B</span>
                </span>
                <span>Titik Awal / Tujuan</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
