import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { meetings } from "@/db/schema/meetings";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

export default async function MeetingsPage() {
  const session = await requireOrgSession();
  const rows = await db()
    .select({
      id: meetings.id,
      title: meetings.title,
      scheduledAt: meetings.scheduledAt,
      durationMinutes: meetings.durationMinutes,
      summary: meetings.summary,
      recordingUrl: meetings.recordingUrl,
      companyId: meetings.companyId,
      companyName: companies.name,
    })
    .from(meetings)
    .innerJoin(companies, eq(meetings.companyId, companies.id))
    .where(eq(meetings.organizationId, session.organizationId))
    .orderBy(desc(meetings.scheduledAt));

  return (
    <div className="px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} meeting{rows.length === 1 ? "" : "s"}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No meetings logged yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-border bg-card/30 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.title}</span>
                    <Link
                      href={`/companies/${m.companyId}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {m.companyName}
                    </Link>
                  </div>
                  {m.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {m.summary}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>{relativeTime(m.scheduledAt)}</div>
                  {m.durationMinutes ? <div>{m.durationMinutes} min</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
