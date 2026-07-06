export const TAG_COLOR: Record<string, string> = {
  saudável: "#28A468",
  atenção: "#E0A52E",
  "semana cheia": "#E07B2E",
  sobrecarga: "#D14B41",
};

export function CapacityBar({ pct, tag }: { pct: number; tag: string }) {
  const color = TAG_COLOR[tag] ?? "#28A468";
  return (
    <div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-vm-muted mt-1">
        {pct}% · {tag}
      </p>
    </div>
  );
}
