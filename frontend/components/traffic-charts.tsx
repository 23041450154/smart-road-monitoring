"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficCurrent } from "@/lib/types";

export function TrafficCharts({ traffic }: { traffic: TrafficCurrent[] }) {
  const composition = [
    {
      name: "Motor",
      value: traffic.reduce((sum, x) => sum + x.motorcycle_count, 0),
      color: "#0284c7", // Sky blue
    },
    {
      name: "Mobil",
      value: traffic.reduce((sum, x) => sum + x.car_count, 0),
      color: "#6366f1", // Indigo
    },
    {
      name: "Bus",
      value: traffic.reduce((sum, x) => sum + x.bus_count, 0),
      color: "#f59e0b", // Amber
    },
    {
      name: "Truk",
      value: traffic.reduce((sum, x) => sum + x.truck_count, 0),
      color: "#64748b", // Slate
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Volume & Komposisi Kendaraan
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Akumulasi lalu lintas terpantau dalam 5 menit terakhir
          </p>
        </div>
        <BarChart3 size={18} className="text-zinc-400" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1.35fr_.65fr]">
        {/* Bar Chart Volume per Jalan */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={traffic} margin={{ left: -20, right: 5, top: 10 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="road_name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.replace("Jl. ", "").slice(0, 12)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(4px)",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="rolling_5_minute"
                name="Kendaraan"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart Komposisi */}
        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composition}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {composition.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {composition.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-xs rounded-md bg-zinc-50/70 p-2"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-zinc-600 font-medium">{item.name}</span>
                <b className="ml-auto text-zinc-900 tabular">{item.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
