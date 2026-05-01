import Link from "next/link";
import { TaskTypeIcon } from "./task-type-icon";
import { TaskActions } from "./task-actions";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

const PRIORITY_STRIPE: Record<string, string> = {
  urgent: "oklch(0.62 0.18 25)",
  high: "oklch(0.72 0.14 65)",
  medium: "oklch(0.55 0.08 250)",
  low: "oklch(0.35 0.04 250)",
};

export type TaskRowData = {
  id: string;
  title: string;
  reasoning: string | null;
  priority: string;
  type: string;
  status: string;
  dueDate: Date | null;
  companyId: string | null;
  companyName: string | null;
};

export function TaskRow({ task }: { task: TaskRowData }) {
  const stripe = PRIORITY_STRIPE[task.priority] ?? PRIORITY_STRIPE.medium!;
  return (
    <div
      className={cn(
        "group grid items-start gap-x-3 border-b border-border-subtle px-0 py-2 transition",
        "hover:bg-surface-hover",
      )}
      style={{ gridTemplateColumns: "3px 28px 1fr auto" }}
    >
      <div
        className="self-stretch rounded-r-[1px]"
        style={{ background: stripe, minHeight: 36 }}
      />
      <div className="flex justify-center pt-[6px] text-text-subtle">
        <TaskTypeIcon type={task.type} size={13} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium leading-tight text-text">
            {task.title}
          </span>
          {task.companyName ? (
            <>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full opacity-70"
                style={{ background: "var(--accent)" }}
              />
              <Link
                href={`/companies/${task.companyId}`}
                className="shrink-0 text-[11px] text-accent hover:underline"
              >
                {task.companyName}
              </Link>
            </>
          ) : null}
        </div>
        {task.reasoning ? (
          <div className="mt-[2px] truncate text-[12px] leading-snug text-text-muted">
            {task.reasoning}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pr-3 pt-[6px]">
        <span className="whitespace-nowrap text-[11px] text-text-subtle">
          {relativeTime(task.dueDate)}
        </span>
        {task.status === "open" ? (
          <div className="opacity-0 transition group-hover:opacity-100">
            <TaskActions taskId={task.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PrioritySectionHeader({
  priority,
  count,
}: {
  priority: string;
  count: number;
}) {
  const meta: Record<string, { label: string; color: string; bg: string }> = {
    urgent: {
      label: "Urgent",
      color: "oklch(0.62 0.18 25)",
      bg: "oklch(0.155 0.03 25 / 0.7)",
    },
    high: {
      label: "High",
      color: "oklch(0.72 0.14 65)",
      bg: "oklch(0.155 0.02 65 / 0.7)",
    },
    medium: { label: "Medium", color: "var(--text-subtle)", bg: "transparent" },
    low: { label: "Low", color: "var(--text-subtle)", bg: "transparent" },
  };
  const cfg = meta[priority] ?? meta.medium!;
  return (
    <div
      className="flex items-center gap-2 border-b border-border-subtle px-3.5 py-1.5"
      style={{ background: cfg.bg }}
    >
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: cfg.color }}
      />
      <span
        className="text-[11px] font-semibold tracking-wide"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
      <span className="text-[11px] text-text-subtle">{count}</span>
    </div>
  );
}
