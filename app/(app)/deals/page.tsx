import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { requireOrgSession } from "@/lib/session";
import { DealsView } from "./deals-view";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: "list" | "board" }>;
}) {
  const session = await requireOrgSession();
  const orgId = session.organizationId;
  const sp = await searchParams;
  const view = sp.view === "board" ? "board" : "list";

  const pipelineRows = await db()
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.organizationId, orgId), eq(pipelines.isDefault, true)))
    .limit(1);
  const pipeline = pipelineRows[0];
  if (!pipeline) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
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
    <DealsView
      pipelineName={pipeline.name}
      view={view}
      stages={stageRows.map((s) => ({
        id: s.id,
        name: s.name,
        isWon: s.isWon,
        isLost: s.isLost,
      }))}
      deals={dealRows}
    />
  );
}
