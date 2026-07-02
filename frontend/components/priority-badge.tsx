import { ArrowDown, ArrowUp, Dash } from "react-bootstrap-icons";
import type { Priority } from "@/lib/types";

const STYLES: Record<Priority, { bg: string; fg: string; icon: typeof ArrowUp }> = {
  Baixa: { bg: "#DCFCE7", fg: "#15803D", icon: ArrowDown },
  Normal: { bg: "#FEF3C7", fg: "#B45309", icon: Dash },
  Alta: { bg: "#FFE4E6", fg: "#BE123C", icon: ArrowUp },
  Crítica: { bg: "#FEE2E2", fg: "#991B1B", icon: ArrowUp },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const s = STYLES[priority] ?? STYLES.Normal;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <Icon size={10} />
      {priority}
    </span>
  );
}
