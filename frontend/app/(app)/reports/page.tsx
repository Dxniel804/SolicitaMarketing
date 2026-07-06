"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar3,
  ChevronDown,
  ExclamationCircleFill,
  FileEarmarkTextFill,
  FlagFill,
  Funnel,
  GearFill,
  Inbox,
  PieChartFill,
  Stars,
  StopwatchFill,
  Upload,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import type { ReportsSummary } from "@/lib/types";

const MONTH_LABELS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SERIES_COLORS = ["#2952E3", "#7C3AED", "#F59E0B", "#10B981", "#EC4899"];
const PRIORITY_COLORS: Record<string, string> = {
  Baixa: "#10B981",
  Normal: "#2952E3",
  Alta: "#EF4444",
  Crítica: "#DC2626",
};

const PRESETS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthYearLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTH_LABELS_FULL[d.getMonth()]}/${d.getFullYear()}`;
}

function downloadReportCsv(data: ReportsSummary, from: string, to: string) {
  const lines: string[] = [];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const section = (title: string, rec: Record<string, number>) => {
    lines.push(escape(title));
    Object.entries(rec).forEach(([k, v]) => lines.push(`${escape(k)},${escape(v)}`));
    lines.push("");
  };

  lines.push(`${escape("Período")},${escape(`${from} a ${to}`)}`);
  lines.push("");
  lines.push(`${escape("Indicador")},${escape("Valor")}`);
  lines.push(`${escape("Entregues no prazo")},${escape(data.delivered_on_time)}`);
  lines.push(`${escape("Entregues fora do prazo")},${escape(data.delivered_late)}`);
  lines.push(`${escape("Devolvidas por briefing incompleto")},${escape(data.returned_for_briefing_count)}`);
  lines.push(`${escape("Tempo médio de triagem (dias)")},${escape(data.avg_triage_days ?? "")}`);
  lines.push(`${escape("Tempo médio de produção (dias)")},${escape(data.avg_production_days ?? "")}`);
  lines.push("");
  section("Por área", data.total_by_area);
  section("Por tipo de demanda", data.total_by_type);
  section("Por prioridade", data.total_by_priority);
  section("Por mês", data.total_by_month);

  const csv = lines.join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-${from}-a-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
  sublabel,
}: {
  icon: typeof Inbox;
  tone: string;
  value: number | string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/15 bg-white p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-vm-ink">{value}</p>
      <p className="text-sm text-vm-muted">{label}</p>
      {sublabel && <p className="mt-1 text-sm font-semibold text-vm-ink">{sublabel}</p>}
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  iconTone,
  title,
  data,
  colorFor,
}: {
  icon: typeof PieChartFill;
  iconTone: string;
  title: string;
  data: Record<string, number>;
  colorFor: (key: string, i: number) => string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div className="rounded-2xl border border-black/15 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className={iconTone} />
        <h2 className="font-bold text-vm-ink">{title}</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-vm-muted">Sem dados no período.</p>
      ) : (
        <div className="space-y-4">
          {entries.slice(0, 5).map(([k, v], i) => (
            <div key={k}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-vm-ink">{k}</span>
                <span className="font-semibold text-vm-ink">{v}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${(v / max) * 100}%`, backgroundColor: colorFor(k, i) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/my-requests"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-vm-primary"
      >
        Ver detalhamento <ArrowRight size={12} />
      </Link>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 90)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setData(null);
    apiFetch<ReportsSummary>(`/reports/summary?from=${from}&to=${to}`).then(setData).catch(() => setData(null));
  }, [from, to]);

  function applyPreset(days: number) {
    setTo(isoDate(new Date()));
    setFrom(isoDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * days)));
    setFiltersOpen(false);
  }

  function applyMonthToDate() {
    const now = new Date();
    setFrom(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(isoDate(now));
    setFiltersOpen(false);
  }

  function applyYearToDate() {
    const now = new Date();
    setFrom(isoDate(new Date(now.getFullYear(), 0, 1)));
    setTo(isoDate(now));
    setFiltersOpen(false);
  }

  const totalInPeriod = useMemo(
    () => (data ? Object.values(data.total_by_month).reduce((sum, v) => sum + v, 0) : 0),
    [data]
  );

  return (
    <div>
      <GradientHero title="Relatórios" subtitle="Indicadores básicos da operação" />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={() => data && downloadReportCsv(data, from, to)}
          disabled={!data}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-vm-ink hover:bg-gray-50 disabled:opacity-40"
        >
          <Upload size={14} />
          Exportar relatório
        </button>

        <div className="relative">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-vm-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-vm-primary/30 hover:bg-vm-primaryDark"
          >
            <Funnel size={14} />
            Filtros
            <ChevronDown size={12} />
          </button>
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.days)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-vm-ink hover:bg-gray-50"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={applyMonthToDate}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-vm-ink hover:bg-gray-50"
                >
                  Este mês
                </button>
                <button
                  onClick={applyYearToDate}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-vm-ink hover:bg-gray-50"
                >
                  Este ano
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-6 rounded-2xl border border-black/15 bg-white p-5">
        <span className="text-sm font-semibold text-vm-ink">Período</span>
        <label className="flex items-center gap-2 text-sm text-vm-muted">
          De
          <span className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-none bg-transparent text-sm text-vm-ink outline-none"
            />
            <Calendar3 size={14} className="shrink-0 text-vm-muted" />
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-vm-muted">
          Até
          <span className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-none bg-transparent text-sm text-vm-ink outline-none"
            />
            <Calendar3 size={14} className="shrink-0 text-vm-muted" />
          </span>
        </label>
      </div>

      {!data ? (
        <p className="mb-6 text-sm text-vm-muted">Carregando...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={Inbox}
              tone="bg-blue-50 text-blue-600"
              value={data.delivered_on_time}
              label="Entregues no prazo"
            />
            <StatCard
              icon={StopwatchFill}
              tone="bg-amber-50 text-amber-600"
              value={data.delivered_late}
              label="Entregues fora do prazo"
            />
            <StatCard
              icon={ExclamationCircleFill}
              tone="bg-red-50 text-red-600"
              value={data.returned_for_briefing_count}
              label="Devolvidas por briefing incompleto"
            />
            <StatCard
              icon={StopwatchFill}
              tone="bg-emerald-50 text-emerald-600"
              value={data.avg_triage_days ?? "—"}
              label="Tempo médio de triagem (dias)"
            />
            <StatCard
              icon={GearFill}
              tone="bg-indigo-50 text-indigo-600"
              value={data.avg_production_days ?? "—"}
              label="Tempo médio de produção (dias)"
            />
            <StatCard
              icon={Calendar3}
              tone="bg-violet-50 text-violet-600"
              value={totalInPeriod}
              label="Solicitações no período"
              sublabel={monthYearLabel(to)}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BreakdownCard
              icon={PieChartFill}
              iconTone="text-blue-500"
              title="Por área"
              data={data.total_by_area}
              colorFor={(_, i) => SERIES_COLORS[i % SERIES_COLORS.length]}
            />
            <BreakdownCard
              icon={FileEarmarkTextFill}
              iconTone="text-blue-500"
              title="Por tipo de demanda"
              data={data.total_by_type}
              colorFor={(_, i) => SERIES_COLORS[i % SERIES_COLORS.length]}
            />
            <BreakdownCard
              icon={FlagFill}
              iconTone="text-red-500"
              title="Por prioridade"
              data={data.total_by_priority}
              colorFor={(k, i) => PRIORITY_COLORS[k] ?? SERIES_COLORS[i % SERIES_COLORS.length]}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-r from-violet-50 via-indigo-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-vm-primary shadow-sm">
            <Stars size={20} />
          </div>
          <div>
            <h3 className="font-bold text-vm-ink">Entenda seus indicadores</h3>
            <p className="mt-1 max-w-md text-sm text-vm-muted">
              Acompanhe o desempenho da operação de marketing e tome decisões baseadas em dados para aumentar a
              eficiência da equipe.
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/painel-illustration.png" alt="" className="hidden max-h-28 w-auto shrink-0 lg:block" />
      </div>
    </div>
  );
}
