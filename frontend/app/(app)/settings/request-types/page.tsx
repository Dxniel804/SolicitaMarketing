"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { RequestType } from "@/lib/types";

export default function RequestTypesSettingsPage() {
  const [types, setTypes] = useState<RequestType[]>([]);

  async function load() {
    const data = await apiFetch<RequestType[]>("/request-types?include_inactive=true");
    setTypes(data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function updateField(id: string, field: string, value: number | boolean) {
    await apiFetch(`/request-types/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Tipos de demanda, pesos e prazos</h1>
      <p className="text-vm-muted mb-6">Configuração que alimenta o cálculo de viabilidade</p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-vm-muted uppercase">
            <tr>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Peso</th>
              <th className="text-left px-4 py-3">Prazo mínimo (dias úteis)</th>
              <th className="text-left px-4 py-3">Exige anexo</th>
              <th className="text-left px-4 py-3">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={t.default_weight}
                    onBlur={(e) => updateField(t.id, "default_weight", Number(e.target.value))}
                    className="w-16 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={t.default_min_business_days}
                    onBlur={(e) => updateField(t.id, "default_min_business_days", Number(e.target.value))}
                    className="w-16 border border-gray-300 rounded px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    defaultChecked={t.requires_attachment}
                    onChange={(e) => updateField(t.id, "requires_attachment", e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    defaultChecked={t.active}
                    onChange={(e) => updateField(t.id, "active", e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
