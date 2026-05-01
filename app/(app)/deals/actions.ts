"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { deals, stages } from "@/db/schema/deals";
import { requireOrgSession } from "@/lib/session";

const Schema = z.object({
  dealId: z.string().uuid(),
  stageId: z.string().uuid(),
});

export async function moveDealStageAction(input: {
  dealId: string;
  stageId: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await requireOrgSession();
  const { dealId, stageId } = Schema.parse(input);

  const dealRow = await db()
    .select({ pipelineId: deals.pipelineId })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, session.organizationId)))
    .limit(1);
  if (!dealRow[0]) return { error: "deal_not_found" };

  const stageRow = await db()
    .select({ pipelineId: stages.pipelineId })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stageRow[0] || stageRow[0].pipelineId !== dealRow[0].pipelineId) {
    return { error: "stage_pipeline_mismatch" };
  }

  await db()
    .update(deals)
    .set({ stageId, stageEnteredAt: new Date(), updatedAt: new Date() })
    .where(eq(deals.id, dealId));
  revalidatePath("/deals");
  return { ok: true };
}
