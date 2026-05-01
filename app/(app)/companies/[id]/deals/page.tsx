import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { deals, stages } from "@/db/schema/deals";
import { money, relativeTime } from "@/lib/format";

export default async function DealsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select({
      id: deals.id,
      name: deals.name,
      value: deals.value,
      stageName: stages.name,
      isWon: stages.isWon,
      isLost: stages.isLost,
      stageEnteredAt: deals.stageEnteredAt,
      expectedCloseDate: deals.expectedCloseDate,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(eq(deals.companyId, id));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No deals on this account.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Deal</th>
            <th className="px-4 py-2 font-medium">Stage</th>
            <th className="px-4 py-2 font-medium text-right">Value</th>
            <th className="px-4 py-2 font-medium">Days in stage</th>
            <th className="px-4 py-2 font-medium">Expected close</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id} className={i > 0 ? "border-t border-border/60" : ""}>
              <td className="px-4 py-3 font-medium">{d.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.stageName}</td>
              <td className="px-4 py-3 text-right tabular-nums">{money(d.value)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {relativeTime(d.stageEnteredAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {relativeTime(d.expectedCloseDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
