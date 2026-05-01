import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { Avatar, CompanyLogo } from "@/components/avatar-init";
import { EngagementPill, PersonaPill } from "@/components/pills";
import { TaskRow, type TaskRowData } from "@/components/task-row";
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

  const personTasks = (await db()
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
    .where(eq(tasks.personId, id))
    .orderBy(desc(tasks.createdAt))
    .limit(8)) as TaskRowData[];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border px-6 pt-3.5">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] text-text-muted">
          <Link href="/people" className="flex items-center gap-1 hover:text-text">
            <ChevronLeft className="h-3 w-3" />
            People
          </Link>
          <span className="text-text-subtle">/</span>
          <span className="text-text">{person.name}</span>
        </div>
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={person.name} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-[20px] font-semibold tracking-tight text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {person.name}
              </h1>
              <PersonaPill value={person.persona} />
              <EngagementPill value={person.engagement} />
            </div>
            <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-text-muted">
              <span>{person.title ?? "—"}</span>
              {row.companyName ? (
                <>
                  <span>·</span>
                  <CompanyLogo name={row.companyName} size={14} />
                  <Link
                    href={`/companies/${person.companyId}`}
                    className="text-accent hover:underline"
                  >
                    {row.companyName}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-6">
            <section>
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                Recent signals
              </div>
              {recentSignals.length === 0 ? (
                <p className="text-[13px] text-text-muted">No signals.</p>
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
                        style={{ background: "var(--accent)" }}
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

            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                Open tasks
              </div>
              {personTasks.length === 0 ? (
                <p className="text-[13px] text-text-muted">No tasks.</p>
              ) : (
                personTasks.map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
              Properties
            </div>
            <dl className="space-y-0 text-[12px]">
              {[
                { label: "Email", value: person.email ?? "—" },
                { label: "LinkedIn", value: person.linkedinUrl ?? "—" },
                { label: "Title", value: person.title ?? "—" },
                { label: "Company", value: row.companyName ?? "—" },
                {
                  label: "Last interaction",
                  value: person.lastInteractionAt ? relativeTime(person.lastInteractionAt) : "—",
                },
                { label: "Created", value: person.createdAt.toLocaleDateString() },
              ].map((r, i) => (
                <div
                  key={r.label}
                  className={`flex flex-col py-1.5 ${
                    i < 5 ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <span className="mb-0.5 text-text-subtle">{r.label}</span>
                  <span className="truncate text-text">{r.value}</span>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}
