import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals, stages } from "@/db/schema/deals";
import { tasks } from "@/db/schema/tasks";
import { PriorityIndicator, TemperaturePill } from "@/components/pills";
import { TaskActions } from "@/components/task-actions";
import { relativeTime, money } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
type Priority = (typeof PRIORITY_ORDER)[number];

export default async function CockpitPage() {
  const session = await requireOrgSession();
  const orgId = session.organizationId;

  const openTasks = await db()
    .select({
      id: tasks.id,
      title: tasks.title,
      reasoning: tasks.reasoning,
      priority: tasks.priority,
      type: tasks.type,
      dueDate: tasks.dueDate,
      companyId: tasks.companyId,
      companyName: companies.name,
    })
    .from(tasks)
    .leftJoin(companies, eq(tasks.companyId, companies.id))
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.status, "open")))
    .orderBy(desc(tasks.priority), tasks.dueDate);

  const grouped: Record<Priority, typeof openTasks> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const t of openTasks) {
    (grouped[t.priority as Priority] ?? grouped.low).push(t);
  }

  const atRisk = await db()
    .select({
      id: deals.id,
      name: deals.name,
      value: deals.value,
      stageEnteredAt: deals.stageEnteredAt,
      stageName: stages.name,
      companyId: deals.companyId,
      companyName: companies.name,
      temperature: companies.temperature,
      lastSignalAt: companies.lastSignalAt,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(
      and(
        eq(deals.organizationId, orgId),
        inArray(companies.temperature, ["cold", "warm"]),
        eq(stages.isWon, false),
        eq(stages.isLost, false),
      ),
    )
    .orderBy(deals.stageEnteredAt)
    .limit(10);

  return (
    <div className="px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Cockpit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openTasks.length} open task{openTasks.length === 1 ? "" : "s"} ·{" "}
          {atRisk.length} deal{atRisk.length === 1 ? "" : "s"} need attention
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Today&apos;s tasks
        </h2>
        {openTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No tasks. Claude is quiet.
          </div>
        ) : (
          <div className="space-y-6">
            {PRIORITY_ORDER.map((priority) => {
              const list = grouped[priority];
              if (list.length === 0) return null;
              return (
                <div key={priority}>
                  <div className="mb-2 flex items-center gap-2">
                    <PriorityIndicator value={priority} />
                    <span className="text-xs text-muted-foreground">{list.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-md border border-border">
                    {list.map((t, i) => (
                      <div
                        key={t.id}
                        className={`flex items-start justify-between gap-4 px-4 py-3 ${
                          i > 0 ? "border-t border-border/60" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{t.title}</span>
                            {t.companyName ? (
                              <Link
                                href={`/companies/${t.companyId}`}
                                className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
                              >
                                {t.companyName}
                              </Link>
                            ) : null}
                          </div>
                          {t.reasoning ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {t.reasoning}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(t.dueDate)}
                          </span>
                          <TaskActions taskId={t.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline at risk
        </h2>
        {atRisk.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No deals at risk. Healthy pipeline.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Deal</th>
                  <th className="px-4 py-2 font-medium">Stage</th>
                  <th className="px-4 py-2 font-medium text-right">Value</th>
                  <th className="px-4 py-2 font-medium">Temperature</th>
                  <th className="px-4 py-2 font-medium">Last signal</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((d, i) => (
                  <tr key={d.id} className={i > 0 ? "border-t border-border/60" : ""}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/companies/${d.companyId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {d.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{d.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.stageName}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {money(d.value)}
                    </td>
                    <td className="px-4 py-2">
                      <TemperaturePill value={d.temperature} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {relativeTime(d.lastSignalAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
