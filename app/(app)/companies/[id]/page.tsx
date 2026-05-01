import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { deals, stages } from "@/db/schema/deals";
import { research, signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { PersonaPill, StagePill, TemperaturePill } from "@/components/pills";
import { PriorityBars } from "@/components/priority-bars";
import { TaskTypeIcon } from "@/components/task-type-icon";
import { money, relativeTime } from "@/lib/format";

export default async function OverviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db().select().from(companies).where(eq(companies.id, id)).limit(1);
  const company = c[0]!;

  const overview = await db()
    .select()
    .from(research)
    .where(and(eq(research.companyId, id), eq(research.section, "overview")))
    .limit(1);

  const recentSignals = await db()
    .select()
    .from(signals)
    .where(eq(signals.companyId, id))
    .orderBy(desc(signals.occurredAt))
    .limit(5);

  const topPeople = await db()
    .select()
    .from(people)
    .where(eq(people.companyId, id))
    .orderBy(desc(people.lastInteractionAt))
    .limit(3);

  const activeDeals = await db()
    .select({
      id: deals.id,
      name: deals.name,
      value: deals.value,
      stageName: stages.name,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(and(eq(deals.companyId, id), eq(stages.isWon, false), eq(stages.isLost, false)));

  const openTasks = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.companyId, id), eq(tasks.status, "open")))
    .orderBy(desc(tasks.priority))
    .limit(5);

  return (
    <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-6">
        {company.description ? (
          <p className="text-[13px] text-text-muted">{company.description}</p>
        ) : null}

        {overview[0] ? (
          <section>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              What&apos;s happening
            </div>
            <div className="rounded-md border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed">
              {overview[0].body}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              Recent signals
            </div>
            <Link
              href={`/companies/${id}/signals`}
              className="text-[11px] text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          {recentSignals.length === 0 ? (
            <p className="text-[13px] text-text-muted">No signals yet.</p>
          ) : (
            <ul className="space-y-0">
              {recentSignals.map((s, i) => (
                <li
                  key={s.id}
                  className={`flex gap-2.5 py-2 ${
                    i < recentSignals.length - 1 ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div
                    className="w-[3px] shrink-0 self-stretch rounded"
                    style={{ background: "oklch(0.65 0.10 250)" }}
                  />
                  <div>
                    <div className="text-[13px] font-medium text-text">{s.title}</div>
                    <div className="mt-0.5 text-[11px] text-text-subtle">
                      {relativeTime(s.occurredAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                Most engaged people
              </div>
              <Link
                href={`/companies/${id}/people`}
                className="text-[11px] text-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            {topPeople.length === 0 ? (
              <p className="text-[13px] text-text-muted">No people yet.</p>
            ) : (
              <ul className="space-y-2">
                {topPeople.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-[13px]">
                    <div>
                      <div className="font-medium text-text">{p.name}</div>
                      <div className="text-[11px] text-text-subtle">{p.title}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PersonaPill value={p.persona} />
                      <TemperaturePill value={p.engagement} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                Active deals
              </div>
              <Link
                href={`/companies/${id}/deals`}
                className="text-[11px] text-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            {activeDeals.length === 0 ? (
              <p className="text-[13px] text-text-muted">No active deals.</p>
            ) : (
              <ul className="space-y-2">
                {activeDeals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-[13px]">
                    <div>
                      <div className="font-medium text-text">{d.name}</div>
                      <div className="mt-0.5">
                        <StagePill value={d.stageName} />
                      </div>
                    </div>
                    <div className="font-mono text-[12px] tabular-nums text-text">
                      {money(d.value)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              Open tasks
            </div>
            <Link
              href={`/companies/${id}/tasks`}
              className="text-[11px] text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-[13px] text-text-muted">No open tasks.</p>
          ) : (
            <ul className="space-y-0">
              {openTasks.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-2.5 py-1.5 ${
                    i < openTasks.length - 1 ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <PriorityBars value={t.priority} />
                  <span className="text-text-subtle">
                    <TaskTypeIcon type={t.type} />
                  </span>
                  <span className="flex-1 text-[13px] text-text">{t.title}</span>
                  <span className="text-[11px] text-text-subtle">
                    {relativeTime(t.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          Properties
        </div>
        <dl className="space-y-0 text-[12px]">
          {[
            { label: "Domain", value: company.domain ?? "—" },
            { label: "Industry", value: company.industry ?? "—" },
            { label: "Employees", value: company.employeeCount?.toLocaleString() ?? "—" },
            { label: "Temperature", value: company.temperature ?? "—" },
            {
              label: "Last signal",
              value: company.lastSignalAt ? relativeTime(company.lastSignalAt) : "—",
            },
            { label: "Created", value: company.createdAt.toLocaleDateString() },
          ].map((row, i) => (
            <div
              key={row.label}
              className={`flex justify-between py-1.5 ${
                i < 5 ? "border-b border-border-subtle" : ""
              }`}
            >
              <dt className="text-text-subtle">{row.label}</dt>
              <dd className="text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
