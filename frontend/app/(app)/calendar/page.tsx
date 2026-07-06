"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BoxArrowUpRight,
  Calendar3,
  CheckCircleFill,
  ChevronDown,
  ClockHistory,
  FileEarmarkText,
  FlagFill,
  GridFill,
  ListUl,
  Stars,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import { StatusBadge } from "@/components/status-badge";
import { TAG_COLOR } from "@/components/capacity-bar";
import type { CalendarWeek, Me } from "@/lib/types";

const MONTH_LABELS = [
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
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function DotProgress({ pct, tag }: { pct: number; tag: string }) {
  const color = TAG_COLOR[tag] ?? "#28A468";
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="w-40">
      <div className="relative h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="absolute left-0 top-0 h-1.5 rounded-full opacity-40"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${clamped}% - 5px)`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1.5 text-right text-xs font-semibold text-vm-ink">
        {pct}% <span className="font-normal text-vm-muted">{tag}</span>
      </p>
    </div>
  );
}

export default function CalendarPage() {
  const [month, setMonth] = useState(currentMonth());
  const [weeks, setWeeks] = useState<CalendarWeek[] | null>(null);
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<CalendarWeek[]>(`/calendar?month=${month}`).then(setWeeks).catch(() => setWeeks([]));
  }, [month]);

  useEffect(() => {
    apiFetch<Me>("/me").then(setMe).catch(() => setMe(null));
  }, []);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const mIdx = Number(month.split("-")[1]);
  const monthLabel = `${MONTH_LABELS[mIdx - 1]} de ${month.split("-")[0]}`;

  const stats = useMemo(() => {
    const rows = weeks ?? [];
    const weeksWithDeliveries = rows.filter((w) => w.items.length > 0).length;
    const totalCapacity = rows.reduce((sum, w) => sum + w.capacity, 0);
    const totalOccupied = rows.reduce((sum, w) => sum + w.occupied, 0);
    const totalAvailable = rows.reduce((sum, w) => sum + w.available, 0);
    const allItems = rows.flatMap((w) => w.items);
    const deliveredCount = allItems.filter((item) => item.status === "Entregue").length;
    const utilizationPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return [
      {
        label: "Semanas com entregas",
        value: weeksWithDeliveries,
        detail: `de ${rows.length} semanas no mês`,
        icon: Calendar3,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Capacidade utilizada",
        value: `${utilizationPct}%`,
        detail: `${totalOccupied} de ${totalCapacity} pts utilizados`,
        icon: CheckCircleFill,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Itens no período",
        value: allItems.length,
        detail: `${deliveredCount} concluídas`,
        icon: FlagFill,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Pontos disponíveis",
        value: totalAvailable,
        detail: `de ${totalCapacity} pts totais`,
        icon: ClockHistory,
        tone: "bg-amber-50 text-amber-600",
      },
    ];
  }, [weeks]);

  return (
    <div>
      <GradientHero title="Calendário de produção" subtitle="Entregas e capacidade por semana" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftMonth(-1)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-vm-ink hover:bg-gray-50"
          >
            <ArrowLeft size={14} /> Mês anterior
          </button>
          <span className="flex items-center gap-1 text-lg font-bold text-vm-ink">
            {monthLabel} <ChevronDown size={14} className="text-vm-muted" />
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-vm-ink hover:bg-gray-50"
          >
            Próximo mês <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setView("lista")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "lista" ? "bg-vm-primary text-white" : "text-vm-muted hover:bg-gray-50"
            }`}
          >
            <ListUl size={14} /> Lista
          </button>
          <button
            disabled
            title="Em breve"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-300"
          >
            <GridFill size={14} /> Calendário
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 divide-y divide-gray-100 rounded-2xl border border-black/15 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-vm-ink">{s.value}</p>
              <p className="truncate text-sm text-vm-muted">{s.label}</p>
              <p className="text-xs text-vm-muted">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {(weeks ?? []).map((w, i) => (
          <div key={w.week_start} className="flex items-center gap-4 overflow-hidden rounded-2xl border border-black/15 bg-white p-5">
            <div className="h-14 w-1.5 shrink-0 self-stretch rounded-full bg-vm-primary" />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-vm-muted">
              {String(i + 1).padStart(2, "0")}
            </div>

            <div className="w-56 shrink-0">
              <p className="font-bold text-vm-ink">
                {formatDay(w.week_start)} – {formatDay(w.week_end)}
              </p>
              <p className="text-sm text-vm-muted">Semana {i + 1}</p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${TAG_COLOR[w.tag] ?? "#28A468"}22`, color: TAG_COLOR[w.tag] ?? "#28A468" }}
              >
                {w.available} pts disponíveis
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {w.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <FileEarmarkText size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-vm-ink">{item.code_or_type}</p>
                    <p className="text-xs text-vm-muted">peso {item.weight}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>

            <DotProgress pct={w.pct} tag={w.tag} />
          </div>
        ))}
        {weeks !== null && weeks.length === 0 && (
          <p className="py-8 text-center text-sm text-vm-muted">Nenhuma semana neste mês.</p>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-black/15 bg-white p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Stars size={16} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-vm-ink">Como funciona a capacidade?</p>
          <p className="text-sm text-vm-muted">
            Cada semana possui uma capacidade de pontos definida na configuração. As solicitações consomem pontos de
            acordo com o peso atribuído.
          </p>
        </div>
        {me?.role === "admin" && (
          <a href="/settings/capacity" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-vm-primary">
            Saiba mais <BoxArrowUpRight size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
