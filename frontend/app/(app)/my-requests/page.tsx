"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircleFill,
  ChevronLeft,
  ChevronRight,
  ClockHistory,
  EnvelopeFill,
  FileEarmarkTextFill,
  GraphUp,
  Image as ImageIcon,
  Megaphone,
  XCircleFill,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import { StatusDot } from "@/components/status-badge";
import { OPEN_STATUSES, type Me, type RequestRow } from "@/lib/types";

const ROW_ICONS = [
  { icon: EnvelopeFill, tone: "bg-violet-50 text-violet-600" },
  { icon: GraphUp, tone: "bg-emerald-50 text-emerald-600" },
  { icon: ImageIcon, tone: "bg-pink-50 text-pink-600" },
  { icon: Megaphone, tone: "bg-blue-50 text-blue-600" },
];

const CANCELLED_STATUSES = ["Cancelado", "Recusado"];
const PAGE_SIZE = 10;

function monthDelta(rows: RequestRow[], predicate: (r: RequestRow) => boolean): number | null {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const matching = rows.filter(predicate);
  const thisMonth = matching.filter((r) => new Date(r.created_at) >= thisMonthStart).length;
  const lastMonth = matching.filter((r) => {
    const d = new Date(r.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;
  if (lastMonth === 0) return null;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

export default function MyRequestsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch<Me>("/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!me) return;
    const query = me.role === "solicitante" ? "mine=true&limit=200" : "limit=200";
    apiFetch<RequestRow[]>(`/requests?${query}`).then(setRequests).catch(() => setRequests([]));
  }, [me]);

  const isOwnRequestsView = me?.role === "solicitante";
  const rows = requests ?? [];

  const stats = useMemo(
    () => [
      {
        label: "Total de solicitações",
        value: rows.length,
        icon: FileEarmarkTextFill,
        tone: "bg-violet-50 text-violet-600",
        deltaPct: monthDelta(rows, () => true),
      },
      {
        label: "Em andamento",
        value: rows.filter((r) => OPEN_STATUSES.includes(r.status)).length,
        icon: ClockHistory,
        tone: "bg-amber-50 text-amber-600",
        deltaPct: monthDelta(rows, (r) => OPEN_STATUSES.includes(r.status)),
      },
      {
        label: "Concluídas",
        value: rows.filter((r) => r.status === "Entregue").length,
        icon: CheckCircleFill,
        tone: "bg-emerald-50 text-emerald-600",
        deltaPct: monthDelta(rows, (r) => r.status === "Entregue"),
      },
      {
        label: "Canceladas",
        value: rows.filter((r) => CANCELLED_STATUSES.includes(r.status)).length,
        icon: XCircleFill,
        tone: "bg-red-50 text-red-600",
        deltaPct: monthDelta(rows, (r) => CANCELLED_STATUSES.includes(r.status)),
      },
    ],
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <GradientHero
        title={isOwnRequestsView ? "Minhas solicitações" : "Solicitações"}
        subtitle={
          isOwnRequestsView
            ? "Acompanhe o status, prazos e viabilidade das suas solicitações."
            : "Acompanhe o status, prazos e viabilidade de todas as solicitações."
        }
      />

      <div className="mb-8 grid grid-cols-1 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-vm-ink">{s.value}</p>
              <p className="truncate text-sm text-vm-muted">{s.label}</p>
              {s.deltaPct !== null && (
                <p className={`text-xs font-semibold ${s.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {s.deltaPct >= 0 ? "+" : ""}
                  {s.deltaPct}% que o mês passado
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-vm-ink">Lista de solicitações</h2>

        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-vm-muted">
            <tr>
              <th className="px-2 pb-2 text-left">Código</th>
              <th className="px-2 pb-2 text-left">Título</th>
              {!isOwnRequestsView && <th className="px-2 pb-2 text-left">Solicitante</th>}
              <th className="px-2 pb-2 text-left">Status</th>
              <th className="px-2 pb-2 text-left">Data solicitada</th>
              <th className="px-2 pb-2 text-left">Data prevista</th>
              <th className="px-2 pb-2 text-left">Última atualização</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => {
              const cancelled = CANCELLED_STATUSES.includes(r.status);
              const RowIcon = cancelled
                ? { icon: XCircleFill, tone: "bg-gray-100 text-gray-500" }
                : ROW_ICONS[i % ROW_ICONS.length];
              return (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${RowIcon.tone}`}>
                        <RowIcon.icon size={15} />
                      </span>
                      <span className="font-medium text-vm-ink">{r.code}</span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-vm-ink">{r.title}</td>
                  {!isOwnRequestsView && <td className="px-2 py-3 text-vm-muted">{r.requester_name}</td>}
                  <td className="px-2 py-3">
                    <StatusDot status={r.status} />
                  </td>
                  <td className="px-2 py-3 text-vm-muted">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-2 py-3 text-vm-muted">
                    {r.approved_delivery_date ?? r.system_suggested_date ?? r.desired_delivery_date}
                  </td>
                  <td className="px-2 py-3 text-vm-muted">
                    {new Date(r.updated_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/requests/${r.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-vm-primary"
                    >
                      Ver detalhes <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {requests !== null && rows.length === 0 && (
              <tr>
                <td colSpan={isOwnRequestsView ? 7 : 8} className="px-2 py-6 text-center text-vm-muted">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1 border-t border-gray-50 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-vm-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-vm-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                    p === currentPage ? "bg-vm-primary text-white" : "text-vm-ink hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
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
  );
}
