import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals, stages } from "@/db/schema/deals";
import { tasks } from "@/db/schema/tasks";
import { CompanyLogo } from "@/components/avatar-init";
import { StagePill, TemperaturePill } from "@/components/pills";
import { PrioritySectionHeader, TaskRow, type TaskRowData } from "@/components/task-row";
import { money, relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;
type Priority = (typeof PRIORITY_ORDER)[number];

const TODAY = new Date();
const dayLabel = TODAY.toLocaleDateString("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export default async function CockpitPage() {
  const session = await requireOrgSession();
  const orgId = session.organizationId;

  const openTasks = (await db()
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
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.status, "open")))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate))) as TaskRowData[];

  const grouped: Record<Priority, TaskRowData[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const t of openTasks) {
    (grouped[t.priority as Priority] ?? grouped.low).push(t);
  }

  const totalDoneToday = await db()
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.status, "done")));

  const totalScope = openTasks.length + totalDoneToday.length;
  const pct = totalScope === 0 ? 0 : Math.round((totalDoneToday.length / totalScope) * 100);

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

  const greeting =
    TODAY.getHours() < 12
      ? "Good morning"
      : TODAY.getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="h-[3px] shrink-0 bg-border-subtle">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "oklch(0.65 0.14 155)" }}
        />
      </div>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3.5">
        <div>
          <h1
            className="text-base font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greeting}, {session.user.name?.split(" ")[0] ?? session.user.email}.
          </h1>
          <p className="mt-0.5 text-[12px] text-text-muted">
            {dayLabel}
            {totalDoneToday.length > 0 ? (
              <>
                {" · "}
                <span style={{ color: "oklch(0.65 0.14 155)" }}>
                  {totalDoneToday.length} completed
                </span>
              </>
            ) : null}
            {" · "}
            <span>{openTasks.length} remaining</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          {[
            { v: "today", label: "Today", active: true },
            { v: "two-days", label: "Next 2 days", active: false },
            { v: "week", label: "This week", active: false },
          ].map((f) => (
            <span
              key={f.v}
              className={
                f.active
                  ? "rounded-md border border-accent bg-accent-subtle px-2.5 py-1 text-[12px] text-accent"
                  : "rounded-md border border-border bg-surface-hover px-2.5 py-1 text-[12px] text-text-muted"
              }
            >
              {f.label}
            </span>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <section className="pt-4">
          {openTasks.length === 0 ? (
            <div className="px-3.5 py-10 text-center text-[13px] text-text-muted">
              All done. Claude is watching.
            </div>
          ) : (
            PRIORITY_ORDER.map((priority) => {
              const list = grouped[priority];
              if (list.length === 0) return null;
              return (
                <div key={priority}>
                  <PrioritySectionHeader priority={priority} count={list.length} />
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              );
            })
          )}
        </section>

        <section className="mt-8">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Pipeline at risk
          </div>
          {atRisk.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-[12px] text-text-muted">
              No deals at risk. Healthy pipeline.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-[12px]">
                <thead className="border-b border-border bg-surface">
                  <tr>
                    {["Company", "Deal", "Value", "Stage", "Days in stage", "Temperature", "Last signal"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-medium text-text-subtle"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((d, i) => {
                    const days = Math.max(
                      0,
                      Math.round((Date.now() - d.stageEnteredAt.getTime()) / 86_400_000),
                    );
                    return (
                      <tr
                        key={d.id}
                        className={`cursor-pointer transition hover:bg-surface-hover ${
                          i > 0 ? "border-t border-border-subtle" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/companies/${d.companyId}`}
                            className="flex items-center gap-2 font-medium text-text"
                          >
                            <CompanyLogo name={d.companyName} size={18} />
                            {d.companyName}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">{d.name}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-text">
                          {money(d.value)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StagePill value={d.stageName} />
                        </td>
                        <td
                          className="px-3 py-2.5 font-mono text-[11px]"
                          style={{
                            color:
                              days > 30 ? "oklch(0.62 0.18 25)" : "var(--text-muted)",
                          }}
                        >
                          {days}d
                        </td>
                        <td className="px-3 py-2.5">
                          <TemperaturePill value={d.temperature} />
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-text-subtle">
                          {relativeTime(d.lastSignalAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
