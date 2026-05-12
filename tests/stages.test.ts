import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import {
  assertStageInOrg,
  createStage,
  deleteStage,
  listStagesForPipeline,
  previewStageFlagToggle,
  reorderStage,
  StageOpError,
  updateStage,
} from "@/lib/stages";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seedOrgWithPipeline(orgId = "org_stages"): Promise<{
  orgId: string;
  pipelineId: string;
  stageIds: string[];
}> {
  await db.insert(organization).values({ id: orgId, name: "Stages", slug: orgId });
  const pipelineId = crypto.randomUUID();
  await db.insert(pipelines).values({ id: pipelineId, organizationId: orgId, name: "Sales", isDefault: true });
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  await db.insert(stages).values([
    { id: ids[0], pipelineId, name: "Lead", order: 0 },
    { id: ids[1], pipelineId, name: "Discovery", order: 1 },
    { id: ids[2], pipelineId, name: "Won", order: 2, isWon: true },
  ]);
  return { orgId, pipelineId, stageIds: ids };
}

async function seedCompany(orgId: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(companies).values({ id, organizationId: orgId, name: "Acme" });
  return id;
}

async function seedDeal(orgId: string, pipelineId: string, stageId: string): Promise<string> {
  const companyId = await seedCompany(orgId);
  const id = crypto.randomUUID();
  await db.insert(deals).values({
    id,
    organizationId: orgId,
    companyId,
    pipelineId,
    stageId,
    name: "Acme deal",
  });
  return id;
}

describe("lib/stages", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("assertStageInOrg returns null for cross-org stages", async () => {
    const a = await seedOrgWithPipeline("org_a");
    const b = await seedOrgWithPipeline("org_b");
    expect(await assertStageInOrg(db, a.stageIds[0]!, b.orgId)).toBeNull();
    expect(await assertStageInOrg(db, a.stageIds[0]!, a.orgId)).not.toBeNull();
  });

  test("createStage always inserts at end (max(order)+1)", async () => {
    const { orgId, pipelineId } = await seedOrgWithPipeline();
    const result = await createStage(db, orgId, { pipelineId, name: "Discovery+" });
    expect(result.after.order).toBe(3);
  });

  test("createStage rejects both isWon and isLost", async () => {
    const { orgId, pipelineId } = await seedOrgWithPipeline();
    let caught: unknown;
    try {
      await createStage(db, orgId, { pipelineId, name: "Bad", isWon: true, isLost: true });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
    expect((caught as StageOpError).code).toBe("won_lost_conflict");
  });

  test("createStage rejects duplicate name within a pipeline", async () => {
    const { orgId, pipelineId } = await seedOrgWithPipeline();
    let caught: unknown;
    try {
      await createStage(db, orgId, { pipelineId, name: "Lead" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
    expect((caught as StageOpError).code).toBe("name_in_use");
  });

  test("updateStage patch semantics; color: null clears", async () => {
    const { orgId, stageIds } = await seedOrgWithPipeline();
    const set = await updateStage(db, orgId, { id: stageIds[0]!, color: "blue" });
    expect(set?.after.color).toBe("blue");

    const cleared = await updateStage(db, orgId, { id: stageIds[0]!, color: null });
    expect(cleared?.after.color).toBeNull();
    expect(cleared?.after.name).toBe("Lead"); // untouched

    const renamed = await updateStage(db, orgId, { id: stageIds[0]!, name: "Brand New" });
    expect(renamed?.after.name).toBe("Brand New");
    expect(renamed?.after.color).toBeNull(); // untouched
  });

  test("updateStage rejects setting both isWon and isLost true", async () => {
    const { orgId, stageIds } = await seedOrgWithPipeline();
    let caught: unknown;
    try {
      await updateStage(db, orgId, { id: stageIds[1]!, isWon: true, isLost: true });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
    expect((caught as StageOpError).code).toBe("won_lost_conflict");
  });

  test("DB CHECK constraint blocks setting both isWon and isLost via direct write", async () => {
    const { pipelineId } = await seedOrgWithPipeline();
    let caught: unknown;
    try {
      await db
        .insert(stages)
        .values({ pipelineId, name: "BothBad", order: 99, isWon: true, isLost: true });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
  });

  test("reorderStage moves down then up; boundary calls return unchanged", async () => {
    const { orgId, pipelineId, stageIds } = await seedOrgWithPipeline();
    const movedDown = await reorderStage(db, orgId, stageIds[0]!, "down");
    expect(movedDown?.after.order).toBe(1);
    expect(movedDown?.partner.order).toBe(0);

    const movedUp = await reorderStage(db, orgId, stageIds[0]!, "up");
    expect(movedUp?.after.order).toBe(0);

    const sortedAfter = await listStagesForPipeline(db, orgId, pipelineId);
    expect(sortedAfter.map((s) => s.id)).toEqual(stageIds);

    // Boundary: top moving up is a no-op.
    const noop = await reorderStage(db, orgId, stageIds[0]!, "up");
    expect(noop?.before.order).toBe(noop?.after.order);
  });

  test("deleteStage migrates deals atomically then deletes the stage", async () => {
    const { orgId, pipelineId, stageIds } = await seedOrgWithPipeline();
    const dealId = await seedDeal(orgId, pipelineId, stageIds[0]!);

    const result = await deleteStage(db, orgId, stageIds[0]!, stageIds[1]!);
    expect(result?.migratedDealIds).toEqual([dealId]);

    const remaining = await db.select().from(stages).where(eq(stages.id, stageIds[0]!));
    expect(remaining.length).toBe(0);

    const moved = await db.select({ stageId: deals.stageId }).from(deals).where(eq(deals.id, dealId));
    expect(moved[0]?.stageId).toBe(stageIds[1]!);
  });

  test("deleteStage refuses self as destination", async () => {
    const { orgId, stageIds } = await seedOrgWithPipeline();
    let caught: unknown;
    try {
      await deleteStage(db, orgId, stageIds[0]!, stageIds[0]!);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
  });

  test("deleteStage refuses cross-pipeline destination", async () => {
    const { orgId, stageIds } = await seedOrgWithPipeline();
    const pipeline2 = crypto.randomUUID();
    await db.insert(pipelines).values({ id: pipeline2, organizationId: orgId, name: "Other" });
    const otherStageId = crypto.randomUUID();
    await db.insert(stages).values({ id: otherStageId, pipelineId: pipeline2, name: "X", order: 0 });

    let caught: unknown;
    try {
      await deleteStage(db, orgId, stageIds[0]!, otherStageId);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
    expect((caught as StageOpError).code).toBe("wrong_pipeline");
  });

  test("deleteStage refuses the only stage in a pipeline", async () => {
    const { orgId } = await seedOrgWithPipeline();
    const lonely = crypto.randomUUID();
    const onlyStage = crypto.randomUUID();
    await db.insert(pipelines).values({ id: lonely, organizationId: orgId, name: "Lonely" });
    await db.insert(stages).values({ id: onlyStage, pipelineId: lonely, name: "Only", order: 0 });
    // dest must be different from src to pass the first guard, then last_stage fires.
    const otherStageId = crypto.randomUUID();
    await db.insert(stages).values({ id: otherStageId, pipelineId: lonely, name: "OnlyDest", order: 1 });
    // Now delete one and try to delete the remaining lone one.
    await deleteStage(db, orgId, onlyStage, otherStageId);
    let caught: unknown;
    try {
      await deleteStage(db, orgId, otherStageId, otherStageId);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(StageOpError);
  });

  test("previewStageFlagToggle counts deals on the stage", async () => {
    const { orgId, pipelineId, stageIds } = await seedOrgWithPipeline();
    expect((await previewStageFlagToggle(db, orgId, stageIds[0]!))?.affectedDealCount).toBe(0);
    await seedDeal(orgId, pipelineId, stageIds[0]!);
    await seedDeal(orgId, pipelineId, stageIds[0]!);
    expect((await previewStageFlagToggle(db, orgId, stageIds[0]!))?.affectedDealCount).toBe(2);
  });

  test("cross-org isolation: updateStage on another org's stage returns null", async () => {
    const a = await seedOrgWithPipeline("org_iso_a");
    const b = await seedOrgWithPipeline("org_iso_b");
    const result = await updateStage(db, b.orgId, { id: a.stageIds[0]!, name: "hijack" });
    expect(result).toBeNull();
  });
});
