import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { companies, people } from "@/db/schema/companies";
import { PersonaPill, TemperaturePill } from "@/components/pills";
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
    <div className="px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} person{rows.length === 1 ? "" : "s"} known
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No people yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Persona</th>
                <th className="px-4 py-2 font-medium">Engagement</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Last interaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id} className={i > 0 ? "border-t border-border/60" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/people/${p.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.title ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.companyName ? (
                      <Link
                        href={`/companies/${p.companyId}`}
                        className="text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {p.companyName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PersonaPill value={p.persona} />
                  </td>
                  <td className="px-4 py-3">
                    <TemperaturePill value={p.engagement} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {relativeTime(p.lastInteractionAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
