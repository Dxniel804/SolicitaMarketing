"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircleFill,
  ClockHistory,
  EnvelopeFill,
  ExclamationTriangleFill,
  FileEarmarkText,
  GraphUp,
  HourglassSplit,
  Image as ImageIcon,
  Megaphone,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { StatusDonut } from "@/components/status-donut";
import { MonthlyTrendChart } from "@/components/monthly-trend-chart";
import type { ActivityItem, DashboardOut, RequestRow, ReportsSummary } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function lastSixMonthsRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(today) };
}

function buildMonthlySeries(totalByMonth: Record<string, number>) {
  const today = new Date();
  const months: { key: string; month: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, month: MONTH_LABELS[d.getMonth()] });
  }
  return months.map((m) => ({ month: m.month, total: totalByMonth[m.key] ?? 0 }));
}

const ROW_ICONS = [
  { icon: ImageIcon, tone: "bg-pink-50 text-pink-600" },
  { icon: EnvelopeFill, tone: "bg-blue-50 text-blue-600" },
  { icon: GraphUp, tone: "bg-emerald-50 text-emerald-600" },
  { icon: Megaphone, tone: "bg-violet-50 text-violet-600" },
];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Há ${Math.max(mins, 1)}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOut | null>(null);
  const [recent, setRecent] = useState<RequestRow[] | null>(null);
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    const { from, to } = lastSixMonthsRange();
    apiFetch<DashboardOut>("/dashboard").then(setData).catch(() => setData(null));
    apiFetch<RequestRow[]>("/requests?limit=5").then(setRecent).catch(() => setRecent([]));
    apiFetch<ReportsSummary>(`/reports/summary?from=${from}&to=${to}`).then(setReports).catch(() => setReports(null));
    apiFetch<ActivityItem[]>("/dashboard/activity?limit=8").then(setActivity).catch(() => setActivity([]));
  }, []);

  if (!data) return <p className="text-sm text-vm-muted">Carregando...</p>;

  const statusData = Object.entries(data.by_status)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const monthlySeries = reports ? buildMonthlySeries(reports.total_by_month) : [];

  return (
    <div>
      <GradientHero
        title="Tudo que o marketing precisa, em um só lugar."
        subtitle="Acompanhe solicitações, aprove pedidos, gerencie prazos e acompanhe a operação de marketing."
        illustration="/painel-illustration.png"
        actions={
          <>
            <Link
              href="/queue"
              className="flex items-center gap-2 rounded-xl bg-vm-ink px-5 py-3 text-sm font-semibold text-white"
            >
              Ver fila geral <ArrowRight size={14} />
            </Link>
            <Link
              href="/reports"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-vm-ink"
            >
              Ver relatórios
            </Link>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FileEarmarkText}
          label="Solicitações abertas"
          value={data.open_count}
          tone="blue"
          deltaPct={data.open_delta_pct}
        />
        <KpiCard
          icon={HourglassSplit}
          label="Em aprovação"
          value={data.awaiting_approval_count}
          tone="amber"
          deltaPct={data.awaiting_approval_delta_pct}
        />
        <KpiCard
          icon={CheckCircleFill}
          label="Concluídas este mês"
          value={data.delivered_this_month_count}
          tone="green"
          deltaPct={data.delivered_delta_pct}
        />
        <KpiCard
          icon={ExclamationTriangleFill}
          label="Atrasadas"
          value={data.delayed_count}
          tone="red"
          highlight={data.delayed_count > 0}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-vm-ink">Solicitações recentes</h2>
            <Link href="/my-requests" className="flex items-center gap-1 text-sm font-semibold text-vm-primary">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-vm-muted">
              <tr>
                <th className="px-2 pb-2 text-left">Solicitação</th>
                <th className="px-2 pb-2 text-left">Tipo</th>
                <th className="px-2 pb-2 text-left">Solicitante</th>
                <th className="px-2 pb-2 text-left">Status</th>
                <th className="px-2 pb-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((r, i) => {
                const RowIcon = ROW_ICONS[i % ROW_ICONS.length];
                return (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="max-w-[200px] px-2 py-3 font-medium text-vm-ink">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${RowIcon.tone}`}>
                        <RowIcon.icon size={14} />
                      </span>
                      <span className="truncate">{r.title}</span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-vm-muted">{r.output_format}</td>
                  <td className="px-2 py-3 text-vm-muted">{r.requester_name}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-2 py-3 text-vm-muted">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
                );
              })}
              {recent !== null && recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-vm-muted">
                    Nenhuma solicitação ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-vm-ink">Distribuição por status</h2>
          <StatusDonut data={statusData} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-bold text-vm-ink">Solicitações por mês</h2>
          <MonthlyTrendChart data={monthlySeries} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-vm-ink">Atividades recentes</h2>
          <ul className="space-y-4">
            {(activity ?? []).map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ClockHistory size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-vm-ink">
                    {a.request_code} → {a.new_status}
                  </p>
                  <p className="truncate text-xs text-vm-muted">{a.request_title}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs text-vm-muted">{timeAgo(a.created_at)}</span>
              </li>
            ))}
            {activity !== null && activity.length === 0 && (
              <p className="text-sm text-vm-muted">Sem atividade recente.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
