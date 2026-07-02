"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MonthlyTrendChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="vmAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2952E3" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2952E3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="total" stroke="#2952E3" strokeWidth={2} fill="url(#vmAreaFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
