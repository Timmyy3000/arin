import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { people } from "@/db/schema/companies";
import { PersonaPill, TemperaturePill } from "@/components/pills";
import { relativeTime } from "@/lib/format";

export default async function PeopleTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db().select().from(people).where(eq(people.companyId, id));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No people known yet at this company.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Person</th>
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
  );
}
