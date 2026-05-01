import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { deals, stages } from "@/db/schema/deals";
import { research, signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { PersonaPill, PriorityIndicator, TemperaturePill } from "@/components/pills";
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
    <div className="space-y-8">
      {company.description ? (
        <section>
          <p className="text-sm text-muted-foreground">{company.description}</p>
        </section>
      ) : null}

      {overview[0] ? (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            What&apos;s happening
          </h3>
          <div className="rounded-md border border-border bg-card/40 p-4 text-sm leading-relaxed">
            {overview[0].body}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent signals
          </h3>
          <Link
            href={`/companies/${id}/signals`}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            View all
          </Link>
        </div>
        {recentSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signals yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentSignals.map((s) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{s.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {relativeTime(s.occurredAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Most engaged people
            </h3>
            <Link
              href={`/companies/${id}/people`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {topPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">No people yet.</p>
          ) : (
            <ul className="space-y-2">
              {topPeople.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PersonaPill value={p.persona} />
                    <TemperaturePill value={p.engagement} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active deals
            </h3>
            <Link
              href={`/companies/${id}/deals`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deals.</p>
          ) : (
            <ul className="space-y-2">
              {activeDeals.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.stageName}</div>
                  </div>
                  <div className="text-sm tabular-nums">{money(d.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Open tasks
          </h3>
          <Link
            href={`/companies/${id}/tasks`}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            View all
          </Link>
        </div>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.reasoning ? (
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {t.reasoning}
                    </div>
                  ) : null}
                </div>
                <PriorityIndicator value={t.priority} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
