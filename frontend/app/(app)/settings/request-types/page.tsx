"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  EaselFill,
  EnvelopeFill,
  FileEarmarkTextFill,
  Fonts,
  Funnel,
  Hash,
  InfoCircle,
  PencilFill,
  Plus,
  QuestionCircle,
  Search,
  ThreeDotsVertical,
  Whatsapp,
  XLg,
} from "react-bootstrap-icons";
import { apiFetch } from "@/lib/api";
import { GradientHero } from "@/components/gradient-hero";
import type { RequestType } from "@/lib/types";

const PAGE_SIZE = 8;

const TYPE_ICON_PALETTE = [
  { icon: FileEarmarkTextFill, tone: "bg-violet-50 text-violet-600" },
  { icon: Hash, tone: "bg-amber-50 text-amber-600" },
  { icon: FileEarmarkTextFill, tone: "bg-emerald-50 text-emerald-600" },
  { icon: EnvelopeFill, tone: "bg-indigo-50 text-indigo-600" },
  { icon: Whatsapp, tone: "bg-emerald-50 text-emerald-600" },
  { icon: PencilFill, tone: "bg-red-50 text-red-500" },
  { icon: Fonts, tone: "bg-blue-50 text-blue-600" },
  { icon: EaselFill, tone: "bg-amber-50 text-amber-600" },
];

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTER_OPTIONS: [StatusFilter, string][] = [
  ["all", "Todos"],
  ["active", "Somente ativos"],
  ["inactive", "Somente inativos"],
];

interface TypeFormValues {
  name: string;
  description: string;
  default_weight: number;
  default_min_business_days: number;
  requires_attachment: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-vm-primary" : "bg-gray-200"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function FieldHint({ text }: { text: string }) {
  return (
    <span title={text} className="text-vm-muted">
      <QuestionCircle size={12} />
    </span>
  );
}

function TypeFormModal({
  title,
  initial,
  nameEditable,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: TypeFormValues;
  nameEditable: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TypeFormValues) => void;
}) {
  const [values, setValues] = useState(initial);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-vm-ink">{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-vm-ink">Nome</label>
            <input
              required
              disabled={!nameEditable}
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-vm-ink outline-none focus:border-vm-primary ${
                !nameEditable ? "bg-gray-50 text-vm-muted" : ""
              }`}
            />
            {!nameEditable && <p className="mt-1 text-xs text-vm-muted">O nome não pode ser alterado após a criação.</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-vm-ink">Descrição</label>
            <textarea
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-vm-ink outline-none focus:border-vm-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-vm-ink">Peso</label>
              <input
                type="number"
                min={1}
                required
                value={values.default_weight}
                onChange={(e) => setValues((v) => ({ ...v, default_weight: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-vm-ink outline-none focus:border-vm-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-vm-ink">Prazo mínimo (dias úteis)</label>
              <input
                type="number"
                min={1}
                required
                value={values.default_min_business_days}
                onChange={(e) => setValues((v) => ({ ...v, default_min_business_days: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-vm-ink outline-none focus:border-vm-primary"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-vm-ink">
            <input
              type="checkbox"
              checked={values.requires_attachment}
              onChange={(e) => setValues((v) => ({ ...v, requires_attachment: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Exige anexo
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-vm-ink hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-vm-primary px-4 py-2 text-sm font-semibold text-white hover:bg-vm-primaryDark disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RequestTypesSettingsPage() {
  const [types, setTypes] = useState<RequestType[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; type: RequestType } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await apiFetch<RequestType[]>("/request-types?include_inactive=true");
    setTypes(data);
  }

  useEffect(() => {
    load().catch(() => setTypes([]));
  }, []);

  async function updateField(id: string, field: string, value: number | boolean) {
    const previous = types;
    setTypes((prev) => prev && prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    try {
      await apiFetch(`/request-types/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    } catch {
      setTypes(previous);
    }
  }

  async function handleCreate(values: TypeFormValues) {
    setSaving(true);
    try {
      await apiFetch("/request-types", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          description: values.description || null,
          default_weight: values.default_weight,
          default_min_business_days: values.default_min_business_days,
          requires_attachment: values.requires_attachment,
        }),
      });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, values: TypeFormValues) {
    setSaving(true);
    try {
      await apiFetch(`/request-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: values.description || null,
          default_weight: values.default_weight,
          default_min_business_days: values.default_min_business_days,
          requires_attachment: values.requires_attachment,
        }),
      });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (types ?? []).filter((t) => {
      if (statusFilter === "active" && !t.active) return false;
      if (statusFilter === "inactive" && t.active) return false;
      if (!term) return true;
      return t.name.toLowerCase().includes(term) || (t.description ?? "").toLowerCase().includes(term);
    });
  }, [types, search, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div>
      <GradientHero
        title="Tipos de demanda, pesos e prazos"
        subtitle="Configure os parâmetros que alimentam o cálculo de viabilidade da operação."
      />

      <div className="relative mb-6 flex justify-end">
        <button
          onClick={() => setHowItWorksOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-vm-ink hover:bg-gray-50"
        >
          <QuestionCircle size={14} />
          Como funciona?
        </button>
        {howItWorksOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setHowItWorksOpen(false)} />
            <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-gray-200 bg-white p-4 text-sm text-vm-muted shadow-lg">
              <p className="mb-2 flex items-center gap-2 font-semibold text-vm-ink">
                <InfoCircle size={14} /> Como o cálculo funciona
              </p>
              <p>
                <strong className="text-vm-ink">Peso</strong> é quanto de capacidade semanal esse tipo consome ao
                entrar em produção. <strong className="text-vm-ink">Prazo mínimo</strong> é quantos dias úteis a
                produção leva, no mínimo. Os dois juntos definem se uma nova solicitação cabe na semana desejada ou
                precisa ser reagendada.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-black/15 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
            <Search size={14} className="text-vm-muted" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Buscar tipo de demanda..."
              className="w-52 border-none bg-transparent text-sm text-vm-ink outline-none placeholder:text-vm-muted"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-vm-ink hover:bg-gray-50"
            >
              <Funnel size={14} />
              Filtros
            </button>
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  {STATUS_FILTER_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        setStatusFilter(value);
                        setPage(1);
                        setFiltersOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        statusFilter === value ? "font-semibold text-vm-primary" : "text-vm-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-2 rounded-xl bg-vm-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-vm-primary/30 hover:bg-vm-primaryDark"
          >
            <Plus size={16} />
            Novo tipo
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-vm-muted">
            <tr>
              <th className="px-4 py-3 text-left">Tipo de demanda</th>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1">
                  Peso <FieldHint text="Pontos de capacidade semanal consumidos por este tipo." />
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1">
                  Prazo mínimo (dias úteis)
                  <FieldHint text="Quantidade mínima de dias úteis para produzir este tipo." />
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1">
                  Exige anexo <FieldHint text="Solicitações desse tipo exigem um arquivo anexado." />
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1">
                  Ativo <FieldHint text="Tipos inativos não aparecem para novas solicitações." />
                </span>
              </th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {paged.map((t, i) => {
              const Palette = TYPE_ICON_PALETTE[i % TYPE_ICON_PALETTE.length];
              return (
                <tr key={t.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${Palette.tone}`}>
                        <Palette.icon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-vm-ink">{t.name}</span>
                        {t.description && (
                          <span className="block truncate text-xs text-vm-muted">{t.description}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      defaultValue={t.default_weight}
                      onBlur={(e) => updateField(t.id, "default_weight", Number(e.target.value))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm text-vm-ink"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      defaultValue={t.default_min_business_days}
                      onBlur={(e) => updateField(t.id, "default_min_business_days", Number(e.target.value))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm text-vm-ink"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateField(t.id, "requires_attachment", !t.requires_attachment)}
                      title={t.requires_attachment ? "Exige anexo" : "Não exige anexo"}
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        t.requires_attachment ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {t.requires_attachment ? <Check size={12} /> : <XLg size={10} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={t.active}
                      onChange={(v) => updateField(t.id, "active", v)}
                      label={t.active ? "Desativar tipo" : "Ativar tipo"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModal({ mode: "edit", type: t })}
                      title="Editar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-vm-muted hover:bg-gray-50 hover:text-vm-ink"
                    >
                      <ThreeDotsVertical size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {types === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-vm-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {types !== null && total === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-vm-muted">
                  Nenhum tipo de demanda encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-vm-muted">
            {total > 0 ? `Mostrando ${rangeStart} a ${rangeEnd} de ${total} tipos de demanda` : ""}
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
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
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

      {modal?.mode === "create" && (
        <TypeFormModal
          title="Novo tipo de demanda"
          saving={saving}
          nameEditable
          initial={{
            name: "",
            description: "",
            default_weight: 1,
            default_min_business_days: 1,
            requires_attachment: false,
          }}
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
        />
      )}
      {modal?.mode === "edit" && (
        <TypeFormModal
          title="Editar tipo de demanda"
          saving={saving}
          nameEditable={false}
          initial={{
            name: modal.type.name,
            description: modal.type.description ?? "",
            default_weight: modal.type.default_weight,
            default_min_business_days: modal.type.default_min_business_days,
            requires_attachment: modal.type.requires_attachment,
          }}
          onClose={() => setModal(null)}
          onSubmit={(values) => handleEdit(modal.type.id, values)}
        />
      )}
    </div>
  );
}
