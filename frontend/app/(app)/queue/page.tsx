"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Buildings,
  Calendar3,
  CheckCircleFill,
  ChevronLeft,
  ChevronRight,
  EnvelopeFill,
  FileEarmarkText,
  Funnel,
  GraphUp,
  HourglassSplit,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Search,
  ThreeDotsVertical,
  Upload,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import { StatusBadge } from "@/components/status-badge";
import { OPEN_STATUSES, type QueueRow, type Status } from "@/lib/types";

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PAGE_SIZE = 10;

const TYPE_ICONS = [
  { icon: ImageIcon, tone: "bg-pink-50 text-pink-600" },
  { icon: EnvelopeFill, tone: "bg-blue-50 text-blue-600" },
  { icon: GraphUp, tone: "bg-emerald-50 text-emerald-600" },
  { icon: Megaphone, tone: "bg-violet-50 text-violet-600" },
];

function parseIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(d.getDate() + days);
  return copy;
}

function formatShortDay(d: Date) {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function formatFullDate(d: Date) {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatWeekday(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

function mondayOf(d: Date) {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday;
}

function weekLabel(weekStart: Date) {
  const today = new Date();
  const rangeStart = mondayOf(new Date(today.getFullYear(), today.getMonth(), 1));
  const diffDays = Math.round((weekStart.getTime() - rangeStart.getTime()) / 86400000);
  const idx = Math.max(1, Math.round(diffDays / 7) + 1);
  return `Semana ${idx}`;
}

function downloadCsv(rows: QueueRow[]) {
  const header = ["Ordem", "Tipo de demanda", "Área solicitante", "Status", "Semana prevista", "Prazo previsto"];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.order, r.request_type_name, r.area, r.status, r.delivery_week_start ?? "", r.effective_date ?? ""]
      .map(escape)
      .join(",")
  );
  const csv = [header.map(escape).join(","), ...lines].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fila-geral.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function QueuePage() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch<QueueRow[]>("/queue").then(setRows).catch(() => setRows([]));
  }, []);

  function toggleStatus(status: Status) {
    setPage(1);
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (!term) return true;
      return r.request_type_name.toLowerCase().includes(term) || r.area.toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const weeksAhead = new Set(all.map((r) => r.delivery_week_start).filter(Boolean));
    return [
      {
        label: "Demandas na fila",
        subtitle: "Aguardando produção",
        value: all.length,
        icon: FileEarmarkText,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Em produção",
        subtitle: "No momento",
        value: all.filter((r) => r.status === "Em produção").length,
        icon: CheckCircleFill,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Aguardando aprovação",
        subtitle: "Revisão pendente",
        value: all.filter((r) => r.status === "Aguardando aprovação de prazo").length,
        icon: HourglassSplit,
        tone: "bg-amber-50 text-amber-600",
      },
      {
        label: "Próximas semanas",
        subtitle: "Com demandas planejadas",
        value: weeksAhead.size,
        icon: Calendar3,
        tone: "bg-blue-50 text-blue-600",
      },
    ];
  }, [rows]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div>
      <GradientHero title="Fila geral" subtitle="Visão resumida da fila de produção" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
          <Search size={14} className="text-vm-muted" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Pesquisar demanda..."
            className="w-48 border-none bg-transparent text-sm text-vm-ink outline-none placeholder:text-vm-muted"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-vm-ink hover:bg-gray-50"
            >
              <Funnel size={14} />
              Filtros
              {statusFilter.size > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vm-primary text-xs text-white">
                  {statusFilter.size}
                </span>
              )}
            </button>
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-semibold uppercase text-vm-muted">Status</p>
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {OPEN_STATUSES.map((status) => (
                      <label
                        key={status}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-vm-ink hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.has(status)}
                          onChange={() => toggleStatus(status)}
                          className="rounded border-gray-300"
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                  {statusFilter.size > 0 && (
                    <button
                      onClick={() => setStatusFilter(new Set())}
                      className="mt-2 text-xs font-semibold text-vm-primary"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <Link
            href="/new"
            className="flex items-center gap-2 rounded-xl bg-vm-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-vm-primary/30 hover:bg-vm-primaryDark"
          >
            <Plus size={16} />
            Nova solicitação
          </Link>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadCsv(filtered)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-vm-ink hover:bg-gray-50"
        >
          <Upload size={14} />
          Exportar
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-black/15 bg-white p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-vm-ink">{s.value}</p>
              <p className="truncate text-sm font-medium text-vm-ink">{s.label}</p>
              <p className="truncate text-xs text-vm-muted">{s.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/15 bg-white">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-vm-muted">
            <tr>
              <th className="px-4 py-3 text-left">Ordem</th>
              <th className="px-4 py-3 text-left">Tipo de demanda</th>
              <th className="px-4 py-3 text-left">Área solicitante</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Semana prevista</th>
              <th className="px-4 py-3 text-left">Prazo previsto</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => {
              const TypeIcon = TYPE_ICONS[i % TYPE_ICONS.length];
              const weekStart = r.delivery_week_start ? parseIsoDate(r.delivery_week_start) : null;
              const weekEnd = weekStart ? addDays(weekStart, 4) : null;
              const effDate = r.effective_date ? parseIsoDate(r.effective_date) : null;
              return (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-sm font-semibold text-vm-primary">
                      {r.order}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TypeIcon.tone}`}>
                        <TypeIcon.icon size={15} />
                      </span>
                      <span className="font-medium text-vm-ink">{r.request_type_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-vm-muted">
                      <Buildings size={14} />
                      {r.area}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {weekStart && weekEnd ? (
                      <span className="flex items-start gap-2">
                        <Calendar3 size={14} className="mt-0.5 shrink-0 text-vm-muted" />
                        <span>
                          <span className="block font-medium text-vm-ink">
                            {formatShortDay(weekStart)} – {formatShortDay(weekEnd)}
                          </span>
                          <span className="block text-xs text-vm-muted">{weekLabel(weekStart)}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-vm-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {effDate ? (
                      <span className="flex items-start gap-2">
                        <Calendar3 size={14} className="mt-0.5 shrink-0 text-vm-muted" />
                        <span>
                          <span className="block font-medium text-vm-ink">{formatFullDate(effDate)}</span>
                          <span className="block text-xs text-vm-muted">{formatWeekday(effDate)}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-vm-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/requests/${r.id}`}
                      title="Ver detalhes"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-vm-muted hover:bg-gray-50 hover:text-vm-ink"
                    >
                      <ThreeDotsVertical size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows === null && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-vm-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {rows !== null && total === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-vm-muted">
                  Nenhuma demanda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-vm-muted">
            {total > 0 ? `Mostrando ${rangeStart} a ${rangeEnd} de ${total} demandas` : ""}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-vm-muted disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                    p === currentPage ? "bg-vm-primary text-white" : "text-vm-ink hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-vm-muted disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
