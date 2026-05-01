import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { AvatarSquare, CompanyLogo } from "@/components/avatar-init";
import { EngagementPill, LifecyclePill, PersonaPill } from "@/components/pills";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

export default async function PeoplePage() {
  const session = await requireOrgSession();
  const rows = await db()
    .select({
      id: people.id,
      name: people.name,
      title: people.title,
      email: people.email,
      linkedinUrl: people.linkedinUrl,
      persona: people.persona,
      engagement: people.engagement,
      lastInteractionAt: people.lastInteractionAt,
      companyId: people.companyId,
      companyName: companies.name,
    })
    .from(people)
    .leftJoin(companies, eq(people.companyId, companies.id))
    .where(eq(people.organizationId, session.organizationId))
    .orderBy(desc(people.lastInteractionAt));

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1
              className="text-base font-semibold tracking-tight text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              People
            </h1>
            <span className="rounded-full border border-border bg-surface-hover px-2 py-px text-[12px] text-text-subtle">
              {rows.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-subtle" />
            <input
              placeholder="Search by name, title, email…"
              className="h-[30px] w-[240px] rounded-md border border-border bg-surface-hover pl-8 pr-2 text-[12px] text-text outline-none placeholder:text-text-subtle focus:border-accent"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="m-6 rounded-md border border-dashed border-border p-12 text-center text-[13px] text-text-muted">
            No people yet.
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface">
              <tr>
                <th className="w-[42px] px-3.5 py-2" />
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Person
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Engagement
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Email
                </th>
                <th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border-subtle transition hover:bg-surface-hover"
                >
                  <td className="px-3.5 py-2.5 align-middle">
                    <AvatarSquare name={p.name} size={28} />
                  </td>
                  <td className="px-3.5 py-2">
                    <Link href={`/people/${p.id}`} className="block">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-text">{p.name}</span>
                      </div>
                      <div className="mb-0.5 mt-0.5 text-[12px] text-text-muted">
                        {p.title ?? "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <PersonaPill value={p.persona} />
                        {p.companyName ? (
                          <span className="flex items-center gap-1 text-[11px] text-accent">
                            <CompanyLogo name={p.companyName} size={12} />
                            {p.companyName}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    <EngagementPill value={p.engagement} />
                  </td>
                  <td className="px-3.5 py-2.5 align-middle font-mono text-[11px] text-text-muted">
                    {p.email ?? "—"}
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    {p.linkedinUrl ? (
                      <a
                        href={p.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-text-subtle opacity-50 hover:opacity-100"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M3.5 2A1.5 1.5 0 102 3.5 1.5 1.5 0 003.5 2zm-1 3.5h2V14h-2zm3.5 0h2v1.4h.03A2.4 2.4 0 0110.2 5c2.2 0 2.6 1.45 2.6 3.33V14h-2V8.8c0-.8-.01-1.83-1.11-1.83s-1.29.87-1.29 1.77V14H6V5.5z" />
                        </svg>
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

void LifecyclePill;
void relativeTime;
