"use client";

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
  const totalVehicles5m = traffic.reduce((sum, x) => sum + x.rolling_5_minute, 0);

  const rawComposition = [
    {
      name: "Motor",
      value: traffic.reduce((sum, x) => sum + x.motorcycle_count, 0),
      color: "#18181b", // Zinc 900
    },
    {
      name: "Mobil",
      value: traffic.reduce((sum, x) => sum + x.car_count, 0),
      color: "#2563eb", // Blue 600
    },
    {
      name: "Bus",
      value: traffic.reduce((sum, x) => sum + x.bus_count, 0),
      color: "#f59e0b", // Amber 500
    },
    {
      name: "Truk",
      value: traffic.reduce((sum, x) => sum + x.truck_count, 0),
      color: "#71717a", // Zinc 500
    },
  ];

  const totalClassified = rawComposition.reduce((sum, x) => sum + x.value, 0);

  const composition = rawComposition.map((item) => ({
    ...item,
    percentage: totalClassified > 0 ? Math.round((item.value / totalClassified) * 100) : 0,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
      {/* Header Analisis */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Volume & Komposisi Kendaraan
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Akumulasi lalu lintas terdeteksi dalam jendela 5 menit terakhir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Total: <strong className="font-semibold text-zinc-900 font-mono">{totalVehicles5m}</strong> kend.
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_.9fr]">
        {/* Bar Chart Volume per Jalan */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Volume per Koridor
            </span>
            <span className="text-[11px] text-zinc-400">Satuan: Kendaraan</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={traffic} margin={{ left: -20, right: 10, top: 10, bottom: 25 }}>
                <CartesianGrid vertical={false} stroke="#f4f4f5" />
                <XAxis
                  dataKey="road_name"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  tickFormatter={(v: string) => v.replace("Jl. ", "").slice(0, 10)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TrafficCurrent;
                      return (
                        <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-md text-xs">
                          <strong className="block font-semibold text-zinc-900">
                            {data.road_name}
                          </strong>
                          <span className="text-[11px] text-zinc-400">
                            {data.camera_name.replace(" (Palembang)", "")}
                          </span>
                          <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-zinc-100 pt-1 text-[11px]">
                            <span className="text-zinc-500">Volume:</span>
                            <span className="font-mono font-semibold text-zinc-900">
                              {data.rolling_5_minute} kend.
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="rolling_5_minute"
                  name="Kendaraan"
                  fill="#18181b"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Komposisi */}
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-100 pt-4 lg:pt-0 lg:pl-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Distribusi Jenis Kendaraan
            </span>
            <span className="text-[11px] text-zinc-400">Model Deteksi AI</span>
          </div>

          <div className="relative h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composition}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {composition.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e4e4e7",
                    fontSize: "11px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                  formatter={(val: unknown) => [`${val} unit`, "Jumlah"]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Donut Statistic */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Total</span>
              <span className="text-base font-bold text-zinc-900 font-mono tabular">{totalClassified}</span>
              <span className="text-[9px] text-zinc-400">Unit</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {composition.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-[11px] font-medium text-zinc-700 truncate">
                  {item.name}
                </span>
                <span className="text-[10px] text-zinc-400 ml-auto font-mono">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
