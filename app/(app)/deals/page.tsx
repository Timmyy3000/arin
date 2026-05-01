import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { requireOrgSession } from "@/lib/session";
import { KanbanBoard } from "./kanban";

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

  return (
    <div className="px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pipeline.name} pipeline · {dealRows.length} deal{dealRows.length === 1 ? "" : "s"} · drag to move
          </p>
        </div>
      </header>

      <KanbanBoard
        stages={stageRows.map((s) => ({ id: s.id, name: s.name }))}
        initialDeals={dealRows}
      />
    </div>
  );
}
