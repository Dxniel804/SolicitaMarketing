"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { ViabilityBadge } from "@/components/viability-badge";
import { CapacityBar } from "@/components/capacity-bar";
import type { Priority, RequestType, ViabilityPreviewOut } from "@/lib/types";

const CHANNELS = ["WhatsApp", "E-mail", "LinkedIn", "Instagram", "Site", "Evento", "Reunião comercial", "Apresentação", "Outro"];
const FORMATS = ["Texto", "PDF", "PPT", "Imagem", "Vídeo", "HTML", "Link web", "Outro"];
const PRIORITIES: Priority[] = ["Baixa", "Normal", "Alta", "Crítica"];
const MAX_UPLOAD_MB = 25;
const ALLOWED_EXT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.svg,.mp4,.zip";

// Campos obrigatórios em RequestCreate (backend/app/schemas/requests.py) que
// o form permite deixar em branco — validar aqui evita um 422 sem explicação
// visível (o backend recusa string vazia em campos `date`, por exemplo).
const REQUIRED_FIELDS: { key: "requester_name" | "area" | "email" | "approver_name" | "title" | "request_type_id" | "what_needs_to_be_done" | "objective" | "target_audience" | "channel" | "output_format" | "desired_delivery_date" | "real_use_date"; label: string }[] = [
  { key: "requester_name", label: "Nome" },
  { key: "area", label: "Área" },
  { key: "email", label: "E-mail" },
  { key: "approver_name", label: "Responsável pela aprovação" },
  { key: "title", label: "Título da solicitação" },
  { key: "request_type_id", label: "Tipo de demanda" },
  { key: "what_needs_to_be_done", label: "O que precisa ser feito" },
  { key: "objective", label: "Qual é o objetivo principal" },
  { key: "target_audience", label: "Público-alvo" },
  { key: "channel", label: "Canal" },
  { key: "output_format", label: "Formato desejado" },
  { key: "desired_delivery_date", label: "Data desejada de entrega" },
  { key: "real_use_date", label: "Data real de uso" },
];

const FIELD_LABELS: Record<string, string> = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f.key, f.label]));

function extractApiErrors(body: unknown): string[] {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (Array.isArray(detail)) {
      // Formato padrão do FastAPI para 422: detail é uma lista de
      // {loc, msg, type}, não o {errors: string[]} que este código assumia.
      return detail.map((d) => {
        const loc = d?.loc as unknown[] | undefined;
        const field = Array.isArray(loc) ? String(loc[loc.length - 1]) : null;
        const label = (field && FIELD_LABELS[field]) || field || "Campo";
        return `${label}: ${d?.msg ?? "valor inválido"}`;
      });
    }
    if (detail && typeof detail === "object" && Array.isArray((detail as { errors?: unknown }).errors)) {
      return (detail as { errors: string[] }).errors;
    }
    if (typeof detail === "string") {
      return [detail];
    }
  }
  return ["Não foi possível enviar a solicitação. Verifique os campos."];
}

interface StagedFile {
  file_name: string;
  file_url: string;
  file_type: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [types, setTypes] = useState<RequestType[]>([]);
  const [preview, setPreview] = useState<ViabilityPreviewOut | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    requester_name: "",
    area: "",
    email: "",
    whatsapp: "",
    approver_name: "",
    approver_email: "",
    confidential: false,
    title: "",
    request_type_id: "",
    what_needs_to_be_done: "",
    objective: "",
    target_audience: "",
    channel: "",
    output_format: "",
    desired_delivery_date: "",
    real_use_date: "",
    priority_requested: "Normal" as Priority,
    priority_justification: "",
    impact_type: "",
    ciente: false,
  });

  useEffect(() => {
    apiFetch<RequestType[]>("/request-types").then(setTypes).catch(() => setTypes([]));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!form.request_type_id && !form.desired_delivery_date) return;
      try {
        const result = await apiFetch<ViabilityPreviewOut>("/requests/viability-preview", {
          method: "POST",
          body: JSON.stringify({
            request_type_id: form.request_type_id || null,
            desired_delivery_date: form.desired_delivery_date || null,
            priority_requested: form.priority_requested,
            priority_justification: form.priority_justification || null,
            attachment_link: staged[0]?.file_url ?? null,
            nome: form.requester_name,
            area: form.area,
            email: form.email,
            aprovador: form.approver_name,
            titulo: form.title,
            oQue: form.what_needs_to_be_done,
            objetivo: form.objective,
            publico: form.target_audience,
            canal: form.channel,
            formato: form.output_format,
            dataUso: form.real_use_date || null,
          }),
        });
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form, staged]);

  const selectedType = useMemo(() => types.find((t) => t.id === form.request_type_id), [types, form.request_type_id]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setErrors([`Arquivo maior que ${MAX_UPLOAD_MB}MB`]);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("request-attachments").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setErrors([`Falha no upload: ${error.message}`]);
      return;
    }
    setStaged((s) => [...s, { file_name: file.name, file_url: path, file_type: file.type }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const missing = REQUIRED_FIELDS.filter(({ key }) => !form[key].trim()).map((f) => `${f.label}: campo obrigatório`);
    if (!form.ciente) missing.push("Você precisa marcar que leu e concorda com as regras de solicitação.");
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string }>("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          attachment_name: staged[0]?.file_name ?? null,
          attachment_link: staged[0]?.file_url ?? null,
        }),
      });
      for (const f of staged) {
        await apiFetch(`/requests/${created.id}/files`, {
          method: "POST",
          body: JSON.stringify(f),
        });
      }
      router.push(`/requests/${created.id}`);
    } catch (err) {
      const body = (err as { body?: unknown }).body;
      setErrors(extractApiErrors(body));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-vm-ink mb-1">Nova solicitação</h1>
      <p className="text-vm-muted mb-6">
        Preencha o briefing — a viabilidade é calculada em tempo real
      </p>

      <div className="grid grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="col-span-2 space-y-5 bg-white border border-gray-200 rounded-xl p-6">
          <Section title="Dados do solicitante">
            <Field label="Nome" value={form.requester_name} onChange={(v) => set("requester_name", v)} />
            <Field label="Área" value={form.area} onChange={(v) => set("area", v)} />
            <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} type="email" />
            <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
            <Field label="Responsável pela aprovação" value={form.approver_name} onChange={(v) => set("approver_name", v)} />
            <Field label="E-mail do aprovador" value={form.approver_email} onChange={(v) => set("approver_email", v)} />
            <Checkbox
              label="Esta demanda é confidencial?"
              checked={form.confidential}
              onChange={(v) => set("confidential", v)}
            />
          </Section>

          <Section title="Identificação da demanda">
            <Field label="Título da solicitação" value={form.title} onChange={(v) => set("title", v)} />
            <SelectField
              label="Tipo de demanda"
              value={form.request_type_id}
              onChange={(v) => set("request_type_id", v)}
              options={types.map((t) => ({ value: t.id, label: `${t.name} · peso ${t.default_weight} · mín ${t.default_min_business_days}d` }))}
            />
          </Section>

          <Section title="Objetivo">
            <TextArea label="O que precisa ser feito?" value={form.what_needs_to_be_done} onChange={(v) => set("what_needs_to_be_done", v)} />
            <TextArea label="Qual é o objetivo principal?" value={form.objective} onChange={(v) => set("objective", v)} />
          </Section>

          <Section title="Público-alvo">
            <TextArea label="Para quem é esse material?" value={form.target_audience} onChange={(v) => set("target_audience", v)} />
          </Section>

          <Section title="Formato de entrega">
            <SelectField
              label="Canal"
              value={form.channel}
              onChange={(v) => set("channel", v)}
              options={CHANNELS.map((c) => ({ value: c, label: c }))}
            />
            <SelectField
              label="Formato desejado"
              value={form.output_format}
              onChange={(v) => set("output_format", v)}
              options={FORMATS.map((f) => ({ value: f, label: f }))}
            />
          </Section>

          <Section title="Prazo">
            <Field label="Data desejada de entrega" value={form.desired_delivery_date} onChange={(v) => set("desired_delivery_date", v)} type="date" />
            <Field label="Data real de uso" value={form.real_use_date} onChange={(v) => set("real_use_date", v)} type="date" />
          </Section>

          <Section title="Prioridade">
            <SelectField
              label="Prioridade solicitada"
              value={form.priority_requested}
              onChange={(v) => set("priority_requested", v as Priority)}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
            {(form.priority_requested === "Alta" || form.priority_requested === "Crítica") && (
              <TextArea label="Justificativa da prioridade" value={form.priority_justification} onChange={(v) => set("priority_justification", v)} />
            )}
          </Section>

          <Section title="Anexos">
            <input type="file" accept={ALLOWED_EXT} onChange={handleFileChange} disabled={uploading} className="text-sm" />
            {uploading && <p className="text-xs text-vm-muted mt-1">Enviando arquivo...</p>}
            <ul className="text-sm mt-2 space-y-1">
              {staged.map((f) => (
                <li key={f.file_url} className="text-vm-muted">📎 {f.file_name}</li>
              ))}
            </ul>
            {selectedType?.requires_attachment && staged.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">Este tipo de demanda exige um anexo ou link.</p>
            )}
          </Section>

          <Section title="Confirmação">
            <p className="text-xs text-vm-muted mb-2">
              Entendo que o envio desta solicitação não garante automaticamente o prazo solicitado. O
              marketing fará a triagem considerando briefing, prioridade, fila atual e capacidade
              semanal. Caso faltem informações ou o prazo seja inviável, a demanda poderá ser
              devolvida ou reprogramada.
            </p>
            <Checkbox
              label="Li e concordo com as regras de solicitação ao marketing."
              checked={form.ciente}
              onChange={(v) => set("ciente", v)}
            />
          </Section>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <ul className="list-disc list-inside">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-vm-accent text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>

        <aside className="space-y-4">
          {preview && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
              <p className="text-xs font-semibold text-vm-muted mb-2">Viabilidade estimada</p>
              <ViabilityBadge level={preview.level} />
              <p className="text-sm mt-3">{preview.message}</p>
              {preview.reasons.length > 0 && (
                <ul className="text-xs text-red-700 list-disc list-inside mt-2">
                  {preview.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              {preview.alerts.length > 0 && (
                <ul className="text-xs text-amber-700 list-disc list-inside mt-2">
                  {preview.alerts.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <p className="text-xs text-vm-muted mb-1">
                  Capacidade da semana: {preview.occupied_before}/{preview.capacity} pts
                </p>
                <CapacityBar
                  pct={preview.capacity > 0 ? Math.round((preview.occupied_before / preview.capacity) * 100) : 0}
                  tag={preview.available_before < 0 ? "sobrecarga" : "saudável"}
                />
              </div>
              <p className="text-xs text-vm-muted mt-3">Peso: {preview.weight} · Prazo mínimo: {preview.min_days} dias úteis</p>
              {preview.suggested_date && (
                <p className="text-sm font-semibold mt-2">Data provável: {preview.suggested_date}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-bold uppercase tracking-wide text-vm-muted mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-vm-ink"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-vm-ink resize-y"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-vm-ink bg-white"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
