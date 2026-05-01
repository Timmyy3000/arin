import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { meetingAttendees, meetings } from "@/db/schema/meetings";
import { AvatarStack, CompanyLogo } from "@/components/avatar-init";
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

  const meetingIds = rows.map((m) => m.id);
  const attendeeRows = meetingIds.length
    ? await db()
        .select({
          meetingId: meetingAttendees.meetingId,
          name: people.name,
        })
        .from(meetingAttendees)
        .innerJoin(people, eq(meetingAttendees.personId, people.id))
        .where(inArray(meetingAttendees.meetingId, meetingIds))
    : [];
  const attendeesByMeeting = new Map<string, string[]>();
  for (const a of attendeeRows) {
    const list = attendeesByMeeting.get(a.meetingId) ?? [];
    list.push(a.name);
    attendeesByMeeting.set(a.meetingId, list);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3.5">
        <h1
          className="text-base font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Meetings
        </h1>
        <button
          type="button"
          className="h-[30px] rounded-md bg-accent px-3 text-[12px] font-medium text-white"
        >
          + Log meeting
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="m-6 rounded-md border border-dashed border-border p-12 text-center text-[13px] text-text-muted">
            No meetings logged yet.
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface">
              <tr>
                {["Meeting", "Company", "Attendees", "Date", "Duration", "Summary"].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className="cursor-pointer border-b border-border-subtle transition hover:bg-surface-hover"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-text">
                      {m.recordingUrl ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="shrink-0"
                          style={{ color: "oklch(0.62 0.18 25)" }}
                        >
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
                        </svg>
                      ) : null}
                      {m.title}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Link
                      href={`/companies/${m.companyId}`}
                      className="flex items-center gap-1.5 text-text-muted hover:text-text"
                    >
                      <CompanyLogo name={m.companyName} size={16} />
                      {m.companyName}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <AvatarStack names={attendeesByMeeting.get(m.id) ?? []} max={3} size={22} />
                  </td>
                  <td className="px-3.5 py-2.5 text-text-muted">
                    {relativeTime(m.scheduledAt)}
                  </td>
                  <td className="px-3.5 py-2.5 text-text-subtle">
                    {m.durationMinutes ? `${m.durationMinutes}m` : "—"}
                  </td>
                  <td className="max-w-[280px] px-3.5 py-2.5 text-text-muted">
                    <div className="truncate">{m.summary ?? "—"}</div>
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
