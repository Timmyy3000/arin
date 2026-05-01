import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import {
  ensureMembership,
  seedAdminUser,
  seedDefaultOrg,
  seedDefaultPipeline,
} from "@/db/seed";
import { member, organization, user } from "@/db/schema/auth";
import { pipelines, stages } from "@/db/schema/deals";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

describe("seed", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("seedDefaultOrg is idempotent", async () => {
    const id1 = await seedDefaultOrg(db, "Default", "default");
    const id2 = await seedDefaultOrg(db, "Default", "default");
    expect(id1).toBe(id2);
    const rows = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, "default"));
    expect(rows).toHaveLength(1);
  });

  test("seedAdminUser creates a Better Auth user", async () => {
    const userId = await seedAdminUser("admin@example.com", "password-1234");
    const rows = await db
      .select()
      .from(user)
      .where(eq(user.email, "admin@example.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(userId);
  }, 30_000);

  test(
    "ensureMembership is idempotent and links user to org",
    async () => {
    const orgId = await seedDefaultOrg(db, "Default", "default");
    const userId = await seedAdminUser("admin@example.com", "password-1234");
    await ensureMembership(db, userId, orgId, "owner");
    await ensureMembership(db, userId, orgId, "owner");
    const rows = await db.select().from(member).where(eq(member.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("owner");
    expect(rows[0]?.organizationId).toBe(orgId);
  },
    30_000,
  );

  test("seedDefaultPipeline creates pipeline with 7 stages, idempotent", async () => {
    const orgId = await seedDefaultOrg(db, "Default", "default");
    const pipelineId1 = await seedDefaultPipeline(db, orgId);
    const pipelineId2 = await seedDefaultPipeline(db, orgId);
    expect(pipelineId1).toBe(pipelineId2);

    const pipelineRows = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.organizationId, orgId));
    expect(pipelineRows).toHaveLength(1);
    expect(pipelineRows[0]?.isDefault).toBe(true);

    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.pipelineId, pipelineId1));
    expect(stageRows).toHaveLength(7);
    expect(stageRows.find((s) => s.name === "Won")?.isWon).toBe(true);
    expect(stageRows.find((s) => s.name === "Lost")?.isLost).toBe(true);
  });
});
