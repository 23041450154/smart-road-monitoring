"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrafficCurrent } from "@/lib/types";

export function TrafficCharts({ traffic }: { traffic: TrafficCurrent[] }) {
  const composition = [
    { name: "Motor", value: traffic.reduce((sum, x) => sum + x.motorcycle_count, 0), color: "#123c33" },
    { name: "Mobil", value: traffic.reduce((sum, x) => sum + x.car_count, 0), color: "#c9f260" },
    { name: "Bus", value: traffic.reduce((sum, x) => sum + x.bus_count, 0), color: "#ffb84d" },
    { name: "Truk", value: traffic.reduce((sum, x) => sum + x.truck_count, 0), color: "#ff7849" },
  ];
  return <div className="rounded-2xl border border-black/8 bg-[#fffef9] p-5 shadow-[0_10px_30px_rgba(16,32,29,.04)]">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#df5b31]">Lima menit terakhir</p><h2 className="mt-1 text-lg font-bold">Volume & komposisi kendaraan</h2></div><BarChart3 size={20} className="text-[#64726e]" /></div>
    <div className="grid gap-5 md:grid-cols-[1.35fr_.65fr]">
      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={traffic} margin={{ left: -25, right: 5 }}><CartesianGrid vertical={false} stroke="#e3e5dd" strokeDasharray="3 3" /><XAxis dataKey="road_name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.replace("Jl. ", "").slice(0, 12)} /><YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: "#f2f3ec" }} contentStyle={{ borderRadius: 12, border: "1px solid #daddd4", fontSize: 12 }} /><Bar dataKey="rolling_5_minute" name="Kendaraan" fill="#123c33" radius={[8, 8, 2, 2]} /></BarChart></ResponsiveContainer></div>
      <div><div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" innerRadius={42} outerRadius={67} paddingAngle={3}>{composition.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2">{composition.map(item => <div key={item.name} className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full" style={{ background: item.color }} /><span className="text-[#64726e]">{item.name}</span><b className="ml-auto">{item.value}</b></div>)}</div></div>
    </div>
  </div>;
}
