import type { ViabilityLevel } from "@/lib/types";

const STYLES: Record<ViabilityLevel, { bg: string; fg: string; label: string }> = {
  verde: { bg: "#DEF1E6", fg: "#1B7A47", label: "Viável" },
  amarelo: { bg: "#FBF0DC", fg: "#9A6B12", label: "Atenção" },
  vermelho: { bg: "#F8DEDC", fg: "#B23B33", label: "Inviável" },
};

export function ViabilityBadge({ level }: { level: ViabilityLevel }) {
  const s = STYLES[level];
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
