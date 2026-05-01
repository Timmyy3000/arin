import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { TemperaturePill } from "@/components/pills";
import { money, relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

export default async function DealsPage() {
  const session = await requireOrgSession();
  const orgId = session.organizationId;

  const pipelineRows = await db()
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.organizationId, orgId), eq(pipelines.isDefault, true)))
    .limit(1);
  const pipeline = pipelineRows[0];
  if (!pipeline) {
    return (
      <div className="px-8 py-6 text-sm text-muted-foreground">
        No default pipeline. Run <code>bun run seed</code>.
      </div>
    );
  }

  const stageRows = await db()
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipeline.id))
    .orderBy(asc(stages.order));

  const dealRows = await db()
    .select({
      id: deals.id,
      name: deals.name,
      value: deals.value,
      stageId: deals.stageId,
      stageEnteredAt: deals.stageEnteredAt,
      companyId: deals.companyId,
      companyName: companies.name,
      temperature: companies.temperature,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(deals.organizationId, orgId));

  const byStage = new Map<string, typeof dealRows>();
  for (const s of stageRows) byStage.set(s.id, []);
  for (const d of dealRows) byStage.get(d.stageId)?.push(d);

  return (
    <div className="px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pipeline.name} pipeline · {dealRows.length} deal{dealRows.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stageRows.map((stage) => {
          const list = byStage.get(stage.id) ?? [];
          const total = list.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
          return (
            <div key={stage.id} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium">{stage.name}</span>
                <span className="text-xs text-muted-foreground">
                  {list.length} · {money(total)}
                </span>
              </div>
              <div className="space-y-2">
                {list.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  list.map((d) => (
                    <Link
                      key={d.id}
                      href={`/companies/${d.companyId}`}
                      className="block rounded-md border border-border bg-card/40 p-3 transition hover:bg-card/70"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{d.companyName}</span>
                        <TemperaturePill value={d.temperature} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{d.name}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="tabular-nums">{money(d.value)}</span>
                        <span className="text-muted-foreground">
                          {relativeTime(d.stageEnteredAt)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
