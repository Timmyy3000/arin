import { cn } from "@/lib/utils";

const TEMP_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  cold: {
    label: "Cold",
    dot: "oklch(0.55 0.10 250)",
    bg: "oklch(0.20 0.04 250 / 0.6)",
    text: "oklch(0.70 0.10 250)",
  },
  warm: {
    label: "Warm",
    dot: "oklch(0.72 0.14 65)",
    bg: "oklch(0.22 0.06 65 / 0.6)",
    text: "oklch(0.75 0.12 65)",
  },
  hot: {
    label: "Hot",
    dot: "oklch(0.68 0.18 30)",
    bg: "oklch(0.22 0.07 30 / 0.6)",
    text: "oklch(0.72 0.16 30)",
  },
  on_fire: {
    label: "On Fire",
    dot: "oklch(0.65 0.20 15)",
    bg: "oklch(0.22 0.08 15 / 0.6)",
    text: "oklch(0.70 0.18 15)",
  },
};

const PERSONA_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  champion: {
    label: "Champion",
    bg: "oklch(0.22 0.05 280 / 0.6)",
    text: "oklch(0.72 0.12 280)",
  },
  decision_maker: {
    label: "Decision Maker",
    bg: "oklch(0.20 0.04 200 / 0.6)",
    text: "oklch(0.68 0.10 200)",
  },
  technical_evaluator: {
    label: "Technical Evaluator",
    bg: "oklch(0.20 0.04 150 / 0.6)",
    text: "oklch(0.65 0.10 150)",
  },
  end_user: {
    label: "End User",
    bg: "oklch(0.19 0.02 250 / 0.6)",
    text: "oklch(0.60 0.06 250)",
  },
  unknown: {
    label: "Unknown",
    bg: "oklch(0.18 0.01 250 / 0.6)",
    text: "oklch(0.50 0.02 250)",
  },
};

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: "Lead", bg: "oklch(0.19 0.01 250 / 0.6)", text: "oklch(0.55 0.04 250)" },
  prospecting: { label: "Prospecting", bg: "oklch(0.19 0.01 250 / 0.6)", text: "oklch(0.55 0.04 250)" },
  qualified: { label: "Qualified", bg: "oklch(0.20 0.04 220 / 0.6)", text: "oklch(0.65 0.08 220)" },
  discovery: { label: "Discovery", bg: "oklch(0.20 0.04 220 / 0.6)", text: "oklch(0.65 0.08 220)" },
  evaluation: { label: "Evaluation", bg: "oklch(0.21 0.06 250 / 0.6)", text: "oklch(0.68 0.13 250)" },
  proposal: { label: "Proposal", bg: "oklch(0.22 0.06 260 / 0.6)", text: "oklch(0.70 0.13 260)" },
  negotiation: { label: "Negotiation", bg: "oklch(0.22 0.07 65 / 0.6)", text: "oklch(0.72 0.14 65)" },
  won: { label: "Won", bg: "oklch(0.20 0.06 155 / 0.6)", text: "oklch(0.65 0.14 155)" },
  lost: { label: "Lost", bg: "oklch(0.19 0.04 25 / 0.6)", text: "oklch(0.55 0.10 25)" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "oklch(0.62 0.18 25)" },
  high: { label: "High", color: "oklch(0.72 0.14 65)" },
  medium: { label: "Medium", color: "oklch(0.55 0.08 250)" },
  low: { label: "Low", color: "oklch(0.50 0.04 250)" },
};

const basePill = "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap";

function styleFromConfig(bg: string, color: string): React.CSSProperties {
  return { background: bg, color };
}

export function TemperaturePill({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) {
    return (
      <span
        className={cn(basePill, "bg-surface-active text-text-subtle", className)}
      >
        —
      </span>
    );
  }
  const cfg = TEMP_CONFIG[value] ?? TEMP_CONFIG.cold!;
  return (
    <span className={cn(basePill, className)} style={styleFromConfig(cfg.bg, cfg.text)}>
      <span
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

export function EngagementPill(props: { value: string | null | undefined; className?: string }) {
  return <TemperaturePill {...props} />;
}

export function PersonaPill({ value, className }: { value: string; className?: string }) {
  const cfg = PERSONA_CONFIG[value] ?? PERSONA_CONFIG.unknown!;
  return (
    <span className={cn(basePill, className)} style={styleFromConfig(cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

export function StagePill({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) {
    return <span className={cn(basePill, "bg-surface-active text-text-subtle", className)}>—</span>;
  }
  const key = value.toLowerCase().replace(/\s+/g, "_");
  const cfg = STAGE_CONFIG[key] ?? STAGE_CONFIG.prospecting!;
  return (
    <span className={cn(basePill, className)} style={styleFromConfig(cfg.bg, cfg.text)}>
      {cfg.label === key ? value : cfg.label}
    </span>
  );
}

export function PriorityIndicator({ value }: { value: string }) {
  const cfg = PRIORITY_CONFIG[value] ?? PRIORITY_CONFIG.medium!;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide"
      style={{ color: cfg.color }}
    >
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export function Badge({
  children,
  color,
  background,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  background?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
      style={{
        color: color ?? "oklch(0.65 0.15 250)",
        background: background ?? "oklch(0.20 0.05 250 / 0.6)",
      }}
    >
      {children}
    </span>
  );
}

export function LifecyclePill({ type }: { type: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    recently_joined: {
      label: "Joined Recently",
      color: "oklch(0.65 0.14 155)",
      bg: "oklch(0.20 0.05 155 / 0.6)",
    },
    recently_promoted: {
      label: "Promoted",
      color: "oklch(0.72 0.14 65)",
      bg: "oklch(0.22 0.06 65 / 0.6)",
    },
    ex_champion: {
      label: "Ex-Champion",
      color: "oklch(0.55 0.10 25)",
      bg: "oklch(0.20 0.04 25 / 0.6)",
    },
  };
  const cfg = configs[type];
  if (!cfg) return null;
  return (
    <Badge color={cfg.color} background={cfg.bg}>
      {cfg.label}
    </Badge>
  );
}
