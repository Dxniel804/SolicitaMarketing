"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ReportsSummary } from "@/lib/types";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 90)));
  const [to, setTo] = useState(isoDate(new Date()));

  useEffect(() => {
    apiFetch<ReportsSummary>(`/reports/summary?from=${from}&to=${to}`).then(setData).catch(() => setData(null));
  }, [from, to]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Relatórios</h1>
      <p className="text-vm-muted mb-6">Indicadores básicos da operação</p>

      <div className="flex gap-3 mb-6 text-sm">
        <label>
          De: <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 ml-1" />
        </label>
        <label>
          Até: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 ml-1" />
        </label>
      </div>

      {!data ? (
        <p className="text-sm text-vm-muted">Carregando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card title="Entregues no prazo" value={data.delivered_on_time} />
          <Card title="Entregues fora do prazo" value={data.delivered_late} />
          <Card title="Devolvidas por briefing incompleto" value={data.returned_for_briefing_count} />
          <Card title="Tempo médio de triagem (dias)" value={data.avg_triage_days ?? "—"} />
          <Card title="Tempo médio de produção (dias)" value={data.avg_production_days ?? "—"} />

          <Breakdown title="Por mês" data={data.total_by_month} />
          <Breakdown title="Por área" data={data.total_by_area} />
          <Breakdown title="Por tipo" data={data.total_by_type} />
          <Breakdown title="Por prioridade" data={data.total_by_priority} />
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-vm-muted mb-1">{title}</p>
      <p className="text-xl font-bold text-vm-ink">{value}</p>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-1">
      <p className="text-xs font-bold uppercase tracking-wide text-vm-muted mb-2">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-vm-muted">Sem dados</p>
      ) : (
        <ul className="text-sm space-y-1">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span>{k}</span>
              <span className="font-semibold">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
