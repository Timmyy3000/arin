import { cn } from "@/lib/utils";

const TEMP_STYLES: Record<string, string> = {
  cold: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  warm: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  hot: "bg-orange-500/10 text-orange-300 ring-orange-500/30",
  on_fire: "bg-red-500/10 text-red-300 ring-red-500/30",
};

const PERSONA_STYLES: Record<string, string> = {
  champion: "bg-purple-500/10 text-purple-300 ring-purple-500/30",
  decision_maker: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/30",
  technical_evaluator: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  end_user: "bg-zinc-500/10 text-zinc-300 ring-zinc-500/30",
  unknown: "bg-muted text-muted-foreground ring-border",
};

const TEMP_LABEL: Record<string, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  on_fire: "On Fire",
};

const PERSONA_LABEL: Record<string, string> = {
  champion: "Champion",
  decision_maker: "Decision Maker",
  technical_evaluator: "Technical Evaluator",
  end_user: "End User",
  unknown: "—",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-zinc-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function basePill(extra?: string) {
  return cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
    extra,
  );
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
      <span className={cn(basePill("bg-muted text-muted-foreground ring-border"), className)}>
        —
      </span>
    );
  }
  return (
    <span className={cn(basePill(TEMP_STYLES[value] ?? "bg-muted text-muted-foreground ring-border"), className)}>
      {TEMP_LABEL[value] ?? value}
    </span>
  );
}

export function PersonaPill({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn(basePill(PERSONA_STYLES[value] ?? PERSONA_STYLES.unknown), className)}>
      {PERSONA_LABEL[value] ?? value}
    </span>
  );
}

export function PriorityIndicator({ value }: { value: string }) {
  const style = PRIORITY_STYLES[value] ?? "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide", style)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {PRIORITY_LABEL[value] ?? value}
    </span>
  );
}
