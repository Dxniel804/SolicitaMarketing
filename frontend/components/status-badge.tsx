import type { Status } from "@/lib/types";

export const STATUS_STYLES: Record<Status, { bg: string; fg: string }> = {
  Recebido: { bg: "#EEF1F5", fg: "#48566B" },
  "Em triagem": { bg: "#E6EEFB", fg: "#2D5BB8" },
  "Aguardando briefing": { bg: "#FBF0DC", fg: "#9A6B12" },
  "Aguardando aprovação de prazo": { bg: "#FCE9DA", fg: "#B5611C" },
  "Aprovado para produção": { bg: "#DEF1E6", fg: "#1B7A47" },
  "Em produção": { bg: "#E6E7FB", fg: "#4A45C2" },
  "Em revisão": { bg: "#F0E6FB", fg: "#7B3FBF" },
  "Ajustes solicitados": { bg: "#FBE7E2", fg: "#B14A2E" },
  Entregue: { bg: "#CDEBD8", fg: "#15663C" },
  Cancelado: { bg: "#EDEEF0", fg: "#6B7280" },
  Recusado: { bg: "#F8DEDC", fg: "#B23B33" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? { bg: "#EEF1F5", fg: "#48566B" };
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? { bg: "#EEF1F5", fg: "#48566B" };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium" style={{ color: s.fg }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.fg }} />
      {status}
    </span>
  );
}
