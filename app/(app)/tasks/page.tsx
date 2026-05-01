import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { tasks } from "@/db/schema/tasks";
import { PriorityIndicator } from "@/components/pills";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

const STATUS_OPTIONS = ["open", "done", "dismissed"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>;
}) {
  const session = await requireOrgSession();
  const sp = await searchParams;
  const status: Status = STATUS_OPTIONS.includes(sp.status as Status) ? (sp.status as Status) : "open";

  const rows = await db()
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
    .orderBy(desc(tasks.priority), asc(tasks.dueDate));

  return (
    <div className="px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {status} task{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <nav className="flex items-center gap-1 rounded-md border border-border p-1 text-xs">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={`/tasks?status=${s}`}
              className={`rounded px-2 py-1 capitalize ${
                s === status ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </Link>
          ))}
        </nav>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No {status} tasks.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li
              key={t.id}
              className="rounded-md border border-border bg-card/30 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <PriorityIndicator value={t.priority} />
                    <span className="text-sm font-medium">{t.title}</span>
                    {t.companyName ? (
                      <Link
                        href={`/companies/${t.companyId}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {t.companyName}
                      </Link>
                    ) : null}
                  </div>
                  {t.reasoning ? (
                    <p className="mt-1 text-xs text-muted-foreground">{t.reasoning}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(t.dueDate)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
