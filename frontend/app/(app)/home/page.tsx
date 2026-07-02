"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  EnvelopeFill,
  ExclamationTriangleFill,
  GraphUp,
  Image as ImageIcon,
  Megaphone,
  XLg,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import { StatusDot } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { OPEN_STATUSES, type RequestRow } from "@/lib/types";

const ROW_ICONS = [
  { icon: EnvelopeFill, tone: "bg-violet-50 text-violet-600" },
  { icon: GraphUp, tone: "bg-emerald-50 text-emerald-600" },
  { icon: ImageIcon, tone: "bg-pink-50 text-pink-600" },
  { icon: Megaphone, tone: "bg-blue-50 text-blue-600" },
];

export default function HomePage() {
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAlert, setShowAlert] = useState(true);

  useEffect(() => {
    apiFetch<RequestRow[]>("/requests?mine=true&limit=100").then(setRequests).catch(() => setRequests([]));
  }, []);

  const open = useMemo(() => (requests ?? []).filter((r) => OPEN_STATUSES.includes(r.status)), [requests]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? open : open.filter((r) => r.status === statusFilter)),
    [open, statusFilter]
  );
  const availableStatuses = useMemo(
    () => OPEN_STATUSES.filter((s) => open.some((r) => r.status === s)),
    [open]
  );

  return (
    <div>
      <GradientHero
        breadcrumbs={[{ label: "Início" }]}
        title="Minhas solicitações"
        subtitle="Acompanhe o andamento dos seus pedidos e abra novas solicitações ao marketing."
        actions={
          <Link
            href="/new"
            className="flex items-center gap-2 rounded-xl bg-vm-primary px-5 py-3 text-sm font-semibold text-white"
          >
            + Abrir nova solicitação
          </Link>
        }
      />

      {showAlert && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ExclamationTriangleFill size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">Antes de abrir uma solicitação</p>
            <p className="mt-1 text-amber-800">
              Verifique se todas as informações estão completas. Pedidos sem briefing suficiente poderão ser
              devolvidos pelo marketing e não entrarão na fila de produção.
            </p>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            aria-label="Dispensar aviso"
            className="shrink-0 text-amber-500 hover:text-amber-700"
          >
            <XLg size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-vm-ink">Minhas solicitações abertas</h2>
            <p className="text-sm text-vm-muted">Acompanhe suas solicitações em andamento.</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-vm-ink"
          >
            <option value="all">Todas as solicitações</option>
            {availableStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {requests === null ? (
          <p className="py-6 text-sm text-vm-muted">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-sm text-vm-muted">Você não tem solicitações em andamento.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((r, i) => {
              const RowIcon = ROW_ICONS[i % ROW_ICONS.length];
              return (
                <Link
                  key={r.id}
                  href={`/requests/${r.id}`}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 py-4 hover:bg-gray-50"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${RowIcon.tone}`}>
                    <RowIcon.icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <p className="text-xs text-vm-muted">{r.code}</p>
                    <p className="truncate font-semibold text-vm-ink">{r.title}</p>
                    <p className="text-xs text-vm-muted">
                      Previsão: {r.approved_delivery_date ?? r.system_suggested_date ?? r.desired_delivery_date}
                    </p>
                  </span>
                  <span className="hidden text-sm sm:block">
                    <p className="text-xs text-vm-muted">Data de criação</p>
                    <p className="text-vm-ink">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </span>
                  <span className="hidden sm:block">
                    <p className="mb-1 text-xs text-vm-muted">Status</p>
                    <StatusDot status={r.status} />
                  </span>
                  <span className="hidden sm:block">
                    <p className="mb-1 text-xs text-vm-muted">Prioridade</p>
                    <PriorityBadge priority={r.priority_requested} />
                  </span>
                  <ChevronRight size={16} className="text-vm-muted" />
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-4 border-t border-gray-50 pt-4 text-center">
          <Link
            href="/my-requests"
            className="inline-flex items-center gap-1 text-sm font-semibold text-vm-primary"
          >
            Ver todas as solicitações <ChevronRight size={14} className="rotate-90" />
          </Link>
        </div>
      </div>
    </div>
  );
}
