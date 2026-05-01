import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { people } from "@/db/schema/companies";
import { AvatarSquare } from "@/components/avatar-init";
import { EngagementPill, PersonaPill } from "@/components/pills";
import { relativeTime } from "@/lib/format";

export default async function PeopleTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db().select().from(people).where(eq(people.companyId, id));

  if (rows.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
        No people known yet at this company.
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <table className="w-full text-[12px]">
        <thead className="border-b border-border bg-surface">
          <tr>
            {["Person", "Persona", "Engagement", "Email", "Last interaction", ""].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-b border-border-subtle transition hover:bg-surface-hover"
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/people/${p.id}`}
                  className="flex items-center gap-2.5"
                >
                  <AvatarSquare name={p.name} size={28} />
                  <div>
                    <div className="text-[13px] font-semibold text-text">{p.name}</div>
                    <div className="text-[11px] text-text-subtle">{p.title ?? "—"}</div>
                  </div>
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <PersonaPill value={p.persona} />
              </td>
              <td className="px-3 py-2.5">
                <EngagementPill value={p.engagement} />
              </td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
                {p.email ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-[11px] text-text-subtle">
                {relativeTime(p.lastInteractionAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
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
    </div>
  );
}
