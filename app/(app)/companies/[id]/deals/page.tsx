import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { deals, stages } from "@/db/schema/deals";
import { StagePill } from "@/components/pills";
import { money, relativeTime } from "@/lib/format";

export default async function DealsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select({
      id: deals.id,
      name: deals.name,
      value: deals.value,
      stageName: stages.name,
      stageEnteredAt: deals.stageEnteredAt,
      expectedCloseDate: deals.expectedCloseDate,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(eq(deals.companyId, id));

  if (rows.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
        No deals on this account.
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <table className="w-full text-[12px]">
        <thead className="border-b border-border bg-surface">
          <tr>
            {["Deal", "Stage", "Value", "Days in stage", "Expected close"].map((h) => (
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
          {rows.map((d) => (
            <tr
              key={d.id}
              className="border-b border-border-subtle transition hover:bg-surface-hover"
            >
              <td className="px-3 py-2.5 font-medium text-text">{d.name}</td>
              <td className="px-3 py-2.5">
                <StagePill value={d.stageName} />
              </td>
              <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums text-text">
                {money(d.value)}
              </td>
              <td className="px-3 py-2.5 text-[11px] text-text-muted">
                {relativeTime(d.stageEnteredAt)}
              </td>
              <td className="px-3 py-2.5 text-[11px] text-text-muted">
                {relativeTime(d.expectedCloseDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
