import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { PersonaPill, TemperaturePill, PriorityIndicator } from "@/components/pills";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession();
  const { id } = await params;

  const personRows = await db()
    .select({
      person: people,
      companyName: companies.name,
    })
    .from(people)
    .leftJoin(companies, eq(people.companyId, companies.id))
    .where(eq(people.id, id))
    .limit(1);
  const row = personRows[0];
  if (!row || row.person.organizationId !== session.organizationId) notFound();
  const person = row.person;

  const recentSignals = await db()
    .select()
    .from(signals)
    .where(eq(signals.personId, id))
    .orderBy(desc(signals.occurredAt))
    .limit(8);

  const openTasks = await db()
    .select()
    .from(tasks)
    .where(eq(tasks.personId, id))
    .orderBy(desc(tasks.createdAt))
    .limit(8);

  return (
    <div className="px-8 py-6">
      <Link
        href="/people"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        ← People
      </Link>
      <header className="mt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <PersonaPill value={person.persona} />
          <TemperaturePill value={person.engagement} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{person.title ?? "—"}</span>
          {row.companyName ? (
            <Link
              href={`/companies/${person.companyId}`}
              className="underline-offset-2 hover:underline"
            >
              · {row.companyName}
            </Link>
          ) : null}
          {person.email ? <span>· {person.email}</span> : null}
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent signals
          </h3>
          {recentSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signals.</p>
          ) : (
            <ul className="space-y-2">
              {recentSignals.map((s) => (
                <li key={s.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                  <div className="flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {relativeTime(s.occurredAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tasks
          </h3>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.title}</div>
                    {t.reasoning ? (
                      <div className="line-clamp-1 text-xs text-muted-foreground">
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
    </div>
  );
}
