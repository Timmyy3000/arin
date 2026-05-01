import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { tasks } from "@/db/schema/tasks";
import {
  PrioritySectionHeader,
  TaskRow,
  type TaskRowData,
} from "@/components/task-row";
import { requireOrgSession } from "@/lib/session";

const STATUS_OPTIONS = ["open", "done", "dismissed"] as const;
type Status = (typeof STATUS_OPTIONS)[number];
const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
type Priority = (typeof PRIORITY_ORDER)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>;
}) {
  const session = await requireOrgSession();
  const sp = await searchParams;
  const status: Status = STATUS_OPTIONS.includes(sp.status as Status)
    ? (sp.status as Status)
    : "open";

  const rows = (await db()
    .select({
      id: tasks.id,
      title: tasks.title,
      reasoning: tasks.reasoning,
      priority: tasks.priority,
      type: tasks.type,
      status: tasks.status,
      dueDate: tasks.dueDate,
      companyId: tasks.companyId,
      companyName: companies.name,
    })
    .from(tasks)
    .leftJoin(companies, eq(tasks.companyId, companies.id))
    .where(and(eq(tasks.organizationId, session.organizationId), eq(tasks.status, status)))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate))) as TaskRowData[];

  const allCounts = await db()
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.organizationId, session.organizationId));
  const total = allCounts.length;
  const done = allCounts.filter((r) => r.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const grouped: Record<Priority, TaskRowData[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  if (status === "open") {
    for (const r of rows) {
      (grouped[r.priority as Priority] ?? grouped.low).push(r);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="h-[3px] shrink-0 bg-border-subtle">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "oklch(0.65 0.14 155)" }}
        />
      </div>
      <header className="shrink-0 border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="text-base font-semibold tracking-tight text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tasks
            </h1>
            <span className="text-[12px] text-text-muted">
              <span
                className="font-medium"
                style={{ color: "oklch(0.65 0.14 155)" }}
              >
                {done}/{total}
              </span>{" "}
              actioned ({pct}%)
            </span>
          </div>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Link
                key={s}
                href={`/tasks?status=${s}`}
                className={
                  s === status
                    ? "rounded-md border border-accent bg-accent-subtle px-2.5 py-1 text-[12px] capitalize text-accent"
                    : "rounded-md border border-border bg-surface-hover px-2.5 py-1 text-[12px] capitalize text-text-muted hover:text-text"
                }
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {status === "open" ? (
          rows.length === 0 ? (
            <div className="px-3.5 py-10 text-center text-[13px] text-text-muted">
              No open tasks.
            </div>
          ) : (
            PRIORITY_ORDER.map((p) => {
              const list = grouped[p];
              if (list.length === 0) return null;
              return (
                <div key={p}>
                  <PrioritySectionHeader priority={p} count={list.length} />
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              );
            })
          )
        ) : rows.length === 0 ? (
          <div className="px-3.5 py-10 text-center text-[13px] text-text-muted">
            No {status} tasks.
          </div>
        ) : (
          rows.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}
