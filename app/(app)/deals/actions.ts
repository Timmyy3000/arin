"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { deals, stages } from "@/db/schema/deals";
import { diffChangedFields, recordAudit, userActor } from "@/lib/audit";
import { deleteDeal } from "@/lib/deals";
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

  const before = await db()
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, session.organizationId)))
    .limit(1);
  if (!before[0]) return { error: "deal_not_found" };

  const stageRow = await db()
    .select({ pipelineId: stages.pipelineId })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stageRow[0] || stageRow[0].pipelineId !== before[0].pipelineId) {
    return { error: "stage_pipeline_mismatch" };
  }

  const [row] = await db()
    .update(deals)
    .set({ stageId, stageEnteredAt: new Date(), updatedAt: new Date() })
    .where(eq(deals.id, dealId))
    .returning();
  if (!row) return { error: "deal_not_found" };
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "deal",
    entityId: row.id,
    action: "update",
    changes: diffChangedFields(before[0], row),
  });
  revalidatePath("/deals");
  return { ok: true };
}

export async function deleteDealAction(input: {
  dealId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const dealId = z.string().uuid().parse(input.dealId);

  const result = await deleteDeal(db(), session.organizationId, dealId);
  if (!result) return { ok: false, message: "Deal not found" };

  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "deal",
    entityId: dealId,
    action: "delete",
    changes: { before: result.before },
  });

  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidatePath(`/companies/${result.before.companyId}/deals`);
  revalidatePath(`/companies/${result.before.companyId}`);
  revalidatePath("/companies");
  return { ok: true };
}
