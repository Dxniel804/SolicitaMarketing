import type { Icon as BootstrapIcon } from "react-bootstrap-icons";

const TONES = {
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
} as const;

export function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
  deltaPct,
}: {
  icon: BootstrapIcon;
  label: string;
  value: number | string;
  tone: keyof typeof TONES;
  highlight?: boolean;
  deltaPct?: number | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/15 bg-white p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-vm-ink"}`}>{value}</p>
        <p className="truncate text-sm text-vm-muted">{label}</p>
        {deltaPct !== undefined && deltaPct !== null && (
          <p className={`text-xs font-semibold ${deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct}% que o mês passado
          </p>
        )}
      </div>
    </div>
  );
}
