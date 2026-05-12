import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { deleteDeal } from "@/lib/deals";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_deals") {
  await db.insert(organization).values({ id: orgId, name: "Deals", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const pipelineId = crypto.randomUUID();
  await db.insert(pipelines).values({ id: pipelineId, organizationId: orgId, name: "Sales" });
  const stageId = crypto.randomUUID();
  await db.insert(stages).values({ id: stageId, pipelineId, name: "Lead", order: 0 });
  const dealId = crypto.randomUUID();
  await db.insert(deals).values({
    id: dealId,
    organizationId: orgId,
    companyId,
    pipelineId,
    stageId,
    name: "Acme Q3 deal",
  });
  return { orgId, dealId };
}

describe("lib/deals", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("deleteDeal removes the row and returns the prior snapshot", async () => {
    const { orgId, dealId } = await seed();
    const result = await deleteDeal(db, orgId, dealId);
    expect(result?.before.id).toBe(dealId);
    const remaining = await db.select().from(deals).where(eq(deals.id, dealId));
    expect(remaining).toHaveLength(0);
  });

  test("deleteDeal returns null for cross-org deals", async () => {
    const { dealId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteDeal(db, "org_b", dealId);
    expect(result).toBeNull();
  });
});
