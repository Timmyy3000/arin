const CONFIG: Record<string, { label: string; bars: number; color: string }> = {
  urgent: { label: "Urgent", bars: 4, color: "oklch(0.62 0.18 25)" },
  high: { label: "High", bars: 3, color: "oklch(0.72 0.14 65)" },
  medium: { label: "Medium", bars: 2, color: "oklch(0.65 0.10 250)" },
  low: { label: "Low", bars: 1, color: "oklch(0.50 0.04 250)" },
};

export function PriorityBars({ value }: { value: string }) {
  const cfg = CONFIG[value] ?? CONFIG.medium!;
  return (
    <span
      title={cfg.label}
      className="inline-flex h-[14px] items-end gap-[2px]"
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rounded-[1px]"
          style={{
            width: 3,
            height: 4 + i * 2.5,
            background: i <= cfg.bars ? cfg.color : "oklch(0.25 0.005 250)",
          }}
        />
      ))}
    </span>
  );
}
