import { and, asc, count, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { isStageColor, type StageColor } from "@/lib/stage-colors";

export type Stage = typeof stages.$inferSelect;
export type StageInsert = typeof stages.$inferInsert;

export type StageFlagField = "isWon" | "isLost";

export class StageOpError extends Error {
  readonly code:
    | "not_found"
    | "wrong_pipeline"
    | "last_stage"
    | "name_in_use"
    | "invalid_color"
    | "won_lost_conflict";
  constructor(code: StageOpError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "StageOpError";
  }
}

export async function assertStageInOrg(
  db: Database,
  stageId: string,
  organizationId: string,
): Promise<Stage | null> {
  const rows = await db
    .select({ stage: stages })
    .from(stages)
    .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
    .where(and(eq(stages.id, stageId), eq(pipelines.organizationId, organizationId)))
    .limit(1);
  return rows[0]?.stage ?? null;
}

async function assertPipelineInOrg(
  db: Database,
  pipelineId: string,
  organizationId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(and(eq(pipelines.id, pipelineId), eq(pipelines.organizationId, organizationId)))
    .limit(1);
  return Boolean(rows[0]);
}

export type CreateStageInput = {
  pipelineId: string;
  name: string;
  color?: StageColor | null;
  isWon?: boolean;
  isLost?: boolean;
};

export async function createStage(
  db: Database,
  organizationId: string,
  input: CreateStageInput,
): Promise<{ before: null; after: Stage }> {
  if (input.color != null && !isStageColor(input.color)) {
    throw new StageOpError("invalid_color", "Unknown stage color");
  }
  if (input.isWon && input.isLost) {
    throw new StageOpError("won_lost_conflict", "Stage cannot be both won and lost");
  }
  const ok = await assertPipelineInOrg(db, input.pipelineId, organizationId);
  if (!ok) throw new StageOpError("not_found", "Pipeline not found");

  const maxRows = await db
    .select({ max: sql<number | null>`MAX(${stages.order})` })
    .from(stages)
    .where(eq(stages.pipelineId, input.pipelineId));
  const nextOrder = (maxRows[0]?.max ?? -1) + 1;

  try {
    const [row] = await db
      .insert(stages)
      .values({
        pipelineId: input.pipelineId,
        name: input.name,
        order: nextOrder,
        color: input.color ?? null,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
      })
      .returning();
    return { before: null, after: row! };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new StageOpError("name_in_use", "A stage with that name already exists");
    }
    throw err;
  }
}

export type UpdateStageInput = {
  id: string;
  name?: string;
  color?: StageColor | null;
  isWon?: boolean;
  isLost?: boolean;
};

export async function updateStage(
  db: Database,
  organizationId: string,
  input: UpdateStageInput,
): Promise<{ before: Stage; after: Stage } | null> {
  const before = await assertStageInOrg(db, input.id, organizationId);
  if (!before) return null;

  if (input.color !== undefined && input.color !== null && !isStageColor(input.color)) {
    throw new StageOpError("invalid_color", "Unknown stage color");
  }
  const nextWon = input.isWon ?? before.isWon;
  const nextLost = input.isLost ?? before.isLost;
  if (nextWon && nextLost) {
    throw new StageOpError("won_lost_conflict", "Stage cannot be both won and lost");
  }

  const patch: Partial<StageInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (input.isWon !== undefined) patch.isWon = input.isWon;
  if (input.isLost !== undefined) patch.isLost = input.isLost;
  if (Object.keys(patch).length === 0) return { before, after: before };

  try {
    const [row] = await db
      .update(stages)
      .set(patch)
      .where(eq(stages.id, input.id))
      .returning();
    if (!row) return null;
    return { before, after: row };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new StageOpError("name_in_use", "A stage with that name already exists");
    }
    throw err;
  }
}

export type ReorderDirection = "up" | "down";

export async function reorderStage(
  db: Database,
  organizationId: string,
  stageId: string,
  direction: ReorderDirection,
): Promise<{ before: Stage; after: Stage; partner: Stage } | null> {
  const current = await assertStageInOrg(db, stageId, organizationId);
  if (!current) return null;

  const siblings = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, current.pipelineId))
    .orderBy(asc(stages.order), asc(stages.id));

  const idx = siblings.findIndex((s) => s.id === stageId);
  if (idx < 0) return null;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return { before: current, after: current, partner: current };

  const partner = siblings[targetIdx]!;
  const currentOrder = current.order;
  const partnerOrder = partner.order;

  const [updatedCurrent, updatedPartner] = await db.transaction(async (tx) => {
    const [a] = await tx
      .update(stages)
      .set({ order: partnerOrder })
      .where(eq(stages.id, current.id))
      .returning();
    const [b] = await tx
      .update(stages)
      .set({ order: currentOrder })
      .where(eq(stages.id, partner.id))
      .returning();
    return [a!, b!];
  });

  return { before: current, after: updatedCurrent, partner: updatedPartner };
}

export async function deleteStage(
  db: Database,
  organizationId: string,
  stageId: string,
  destinationStageId: string,
): Promise<{ before: Stage; migratedDealIds: string[] } | null> {
  if (stageId === destinationStageId) {
    throw new StageOpError("wrong_pipeline", "Destination must be a different stage");
  }
  const current = await assertStageInOrg(db, stageId, organizationId);
  if (!current) return null;

  const dest = await assertStageInOrg(db, destinationStageId, organizationId);
  if (!dest) throw new StageOpError("not_found", "Destination stage not found");
  if (dest.pipelineId !== current.pipelineId) {
    throw new StageOpError("wrong_pipeline", "Destination must be in the same pipeline");
  }

  const siblingCount = await db
    .select({ n: count() })
    .from(stages)
    .where(eq(stages.pipelineId, current.pipelineId));
  if ((siblingCount[0]?.n ?? 0) <= 1) {
    throw new StageOpError("last_stage", "Cannot delete the only stage in a pipeline");
  }

  const migratedDealIds = await db.transaction(async (tx) => {
    const affected = await tx
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.stageId, stageId));
    const ids = affected.map((d) => d.id);
    if (ids.length > 0) {
      await tx
        .update(deals)
        .set({ stageId: destinationStageId, stageEnteredAt: new Date(), updatedAt: new Date() })
        .where(eq(deals.stageId, stageId));
    }
    await tx.delete(stages).where(eq(stages.id, stageId));
    return ids;
  });

  return { before: current, migratedDealIds };
}

export async function previewStageFlagToggle(
  db: Database,
  organizationId: string,
  stageId: string,
): Promise<{ affectedDealCount: number } | null> {
  const stage = await assertStageInOrg(db, stageId, organizationId);
  if (!stage) return null;
  const rows = await db
    .select({ n: count() })
    .from(deals)
    .where(eq(deals.stageId, stageId));
  return { affectedDealCount: rows[0]?.n ?? 0 };
}

export async function listStagesForPipeline(
  db: Database,
  organizationId: string,
  pipelineId: string,
): Promise<Stage[]> {
  const ok = await assertPipelineInOrg(db, pipelineId, organizationId);
  if (!ok) return [];
  return db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.order), asc(stages.id));
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "23505";
}

