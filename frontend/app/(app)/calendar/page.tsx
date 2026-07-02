"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CapacityBar } from "@/components/capacity-bar";
import { StatusBadge } from "@/components/status-badge";
import type { CalendarWeek } from "@/lib/types";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [month, setMonth] = useState(currentMonth());
  const [weeks, setWeeks] = useState<CalendarWeek[] | null>(null);

  useEffect(() => {
    apiFetch<CalendarWeek[]>(`/calendar?month=${month}`).then(setWeeks).catch(() => setWeeks([]));
  }, [month]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Calendário de produção</h1>
      <p className="text-vm-muted mb-6">Entregas e capacidade por semana</p>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => shiftMonth(-1)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm">
          ← Mês anterior
        </button>
        <span className="text-sm font-semibold">{month}</span>
        <button onClick={() => shiftMonth(1)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm">
          Próximo mês →
        </button>
      </div>

      <div className="space-y-4">
        {(weeks ?? []).map((w) => (
          <div key={w.week_start} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-vm-ink">
                  {w.week_start} a {w.week_end}
                </p>
                <p className="text-xs text-vm-muted">
                  {w.occupied}/{w.capacity} pts · {w.available} disponíveis
                </p>
              </div>
              <div className="w-40">
                <CapacityBar pct={w.pct} tag={w.tag} />
              </div>
            </div>
            {w.items.length > 0 && (
              <ul className="space-y-1.5">
                {w.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm border-t border-gray-50 pt-1.5">
                    <span>
                      {item.code_or_type} {item.responsavel && `· ${item.responsavel}`} · peso {item.weight}
                    </span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
