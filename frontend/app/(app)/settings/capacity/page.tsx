"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CapacityBar } from "@/components/capacity-bar";
import type { WeeklyCapacity } from "@/lib/types";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CapacitySettingsPage() {
  const [weeks, setWeeks] = useState<WeeklyCapacity[]>([]);

  async function load() {
    const today = new Date();
    const from = isoDate(today);
    const to = isoDate(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 7 * 16));
    const data = await apiFetch<WeeklyCapacity[]>(`/weekly-capacities?from=${from}&to=${to}`);
    setWeeks(data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function save(week: WeeklyCapacity, patch: Partial<WeeklyCapacity>) {
    await apiFetch(`/weekly-capacities/${week.week_start}`, {
      method: "PUT",
      body: JSON.stringify({
        capacity_points: patch.capacity_points ?? week.capacity_points,
        is_blocked: patch.is_blocked ?? week.is_blocked,
        notes: patch.notes ?? week.notes,
      }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Capacidade semanal</h1>
      <p className="text-vm-muted mb-6">Pontos disponíveis por semana</p>

      <div className="space-y-3">
        {weeks.map((w) => (
          <div key={w.week_start} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
            <div className="w-40">
              <p className="text-sm font-semibold">{w.week_start}</p>
              <p className="text-xs text-vm-muted">a {w.week_end}</p>
            </div>
            <label className="flex flex-col text-xs text-vm-muted">
              Capacidade
              <input
                type="number"
                defaultValue={w.capacity_points}
                onBlur={(e) => save(w, { capacity_points: Number(e.target.value) })}
                className="w-20 border border-gray-300 rounded px-2 py-1 mt-1 text-sm text-vm-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-vm-muted">
              <input
                type="checkbox"
                defaultChecked={w.is_blocked}
                onChange={(e) => save(w, { is_blocked: e.target.checked })}
              />
              Bloqueada
            </label>
            <input
              type="text"
              defaultValue={w.notes ?? ""}
              placeholder="Observação"
              onBlur={(e) => save(w, { notes: e.target.value })}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
            <div className="w-32">
              <CapacityBar pct={w.pct ?? 0} tag={w.tag ?? "saudável"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
