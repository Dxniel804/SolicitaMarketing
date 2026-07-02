"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import type { QueueRow } from "@/lib/types";

export default function QueuePage() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);

  useEffect(() => {
    apiFetch<QueueRow[]>("/queue").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Fila geral</h1>
      <p className="text-vm-muted mb-6">Visão resumida da fila de produção</p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-vm-muted uppercase">
            <tr>
              <th className="text-left px-4 py-3">Ordem</th>
              <th className="text-left px-4 py-3">Tipo de demanda</th>
              <th className="text-left px-4 py-3">Área solicitante</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Semana prevista</th>
              <th className="text-left px-4 py-3">Prazo previsto</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{r.order}</td>
                <td className="px-4 py-3">{r.request_type_name}</td>
                <td className="px-4 py-3">{r.area}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">{r.delivery_week_start ?? "—"}</td>
                <td className="px-4 py-3">{r.effective_date ?? "—"}</td>
              </tr>
            ))}
            {rows !== null && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-vm-muted">
                  Nenhuma demanda em aberto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
