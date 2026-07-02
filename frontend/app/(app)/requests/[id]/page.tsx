"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { ViabilityBadge } from "@/components/viability-badge";
import type { Me, RequestComment, RequestFile, RequestRow } from "@/lib/types";

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [req, me_, fileList, commentList] = await Promise.all([
      apiFetch<RequestRow>(`/requests/${id}`),
      apiFetch<Me>("/me"),
      apiFetch<RequestFile[]>(`/requests/${id}/files`),
      apiFetch<RequestComment[]>(`/requests/${id}/comments`),
    ]);
    setRequest(req);
    setMe(me_);
    setFiles(fileList);
    setComments(commentList);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAction(path: string, body?: unknown) {
    setBusy(true);
    try {
      await apiFetch(`/requests/${id}${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/requests/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: newComment, is_internal: isInternal }),
      });
      setNewComment("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!request || !me) {
    return <p className="text-sm text-vm-muted">Carregando...</p>;
  }

  const isAdmin = me.role === "admin";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div>
          <p className="text-xs text-vm-muted">{request.code}</p>
          <h1 className="text-2xl font-bold text-vm-ink">{request.title}</h1>
          <div className="flex gap-2 mt-2">
            <StatusBadge status={request.status} />
            <ViabilityBadge level={request.viability_status} />
            {request.confidential && (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                Confidencial
              </span>
            )}
          </div>
        </div>

        <Card title="Briefing">
          <Row label="O que precisa ser feito" value={request.what_needs_to_be_done} />
          <Row label="Objetivo" value={request.objective} />
          <Row label="Público-alvo" value={request.target_audience} />
          <Row label="Canal" value={request.channel} />
          <Row label="Formato" value={request.output_format} />
        </Card>

        <Card title="Prazo">
          <Row label="Data desejada" value={request.desired_delivery_date} />
          <Row label="Data real de uso" value={request.real_use_date} />
          <Row label="Data mínima possível" value={request.min_possible_date ?? "—"} />
          <Row label="Data sugerida pelo sistema" value={request.system_suggested_date ?? "—"} />
          <Row label="Data aprovada" value={request.approved_delivery_date ?? "—"} />
        </Card>

        <Card title="Arquivos">
          {files.length === 0 ? (
            <p className="text-sm text-vm-muted">Nenhum arquivo anexado.</p>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.id}>
                  <a href={f.signed_url} target="_blank" rel="noreferrer" className="text-sm text-vm-accent">
                    📎 {f.file_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Comentários">
          <ul className="space-y-3 mb-4">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <p className={c.is_internal ? "text-purple-700" : "text-vm-ink"}>
                  {c.is_internal && <span className="text-xs font-semibold mr-1">[interno]</span>}
                  {c.comment}
                </p>
                <p className="text-xs text-vm-muted">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
              </li>
            ))}
            {comments.length === 0 && <p className="text-sm text-vm-muted">Sem comentários.</p>}
          </ul>
          {isAdmin && (
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Escrever comentário..."
              />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Comentário interno (não visível ao solicitante)
              </label>
              <button
                onClick={sendComment}
                disabled={busy}
                className="bg-vm-ink text-white rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Enviar
              </button>
            </div>
          )}
        </Card>
      </div>

      {isAdmin && (
        <aside className="space-y-3">
          <Card title="Ações de triagem">
            <div className="space-y-2">
              <ActionButton label="Aprovar prazo" onClick={() => runAction("/approve")} disabled={busy} />
              <ActionButton label="Reprogramar" onClick={() => runAction("/reprogram")} disabled={busy} />
              <ActionButton
                label="Devolver para briefing"
                onClick={() => runAction("/return-for-briefing", {})}
                disabled={busy}
              />
              <ActionButton label="Marcar como entregue" onClick={() => runAction("/deliver", {})} disabled={busy} />
              <ActionButton label="Cancelar" onClick={() => runAction("/cancel")} disabled={busy} danger />
              <ActionButton label="Recusar" onClick={() => runAction("/reject")} disabled={busy} danger />
            </div>
          </Card>

          <Card title="Informações internas">
            <Row label="Peso padrão" value={String(request.default_weight)} />
            <Row label="Peso ajustado" value={String(request.adjusted_weight ?? request.default_weight)} />
            <Row label="Responsável" value={request.responsavel ?? "—"} />
            <Row label="Reservar capacidade" value={request.reserve_capacity ? "Sim" : "Não"} />
          </Card>
        </aside>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-vm-muted mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-b-0">
      <span className="text-vm-muted">{label}</span>
      <span className="text-vm-ink font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${
        danger ? "bg-red-50 text-red-700" : "bg-gray-50 text-vm-ink hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
