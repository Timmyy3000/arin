import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { auditLog } from "@/db/schema/audit";
import { organization, user } from "@/db/schema/auth";
import {
  diffChangedFields,
  getEntityAudit,
  getEntityAuditBatch,
  recordAudit,
  userActor,
  type Actor,
} from "@/lib/audit";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seedOrg(orgId = "org_audit"): Promise<string> {
  await db.insert(organization).values({ id: orgId, name: "A", slug: orgId });
  return orgId;
}

async function seedUser(userId: string, name: string): Promise<void> {
  await db.insert(user).values({ id: userId, name, email: `${userId}@example.com` });
}

describe("audit", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("recordAudit writes a row with all expected fields populated", async () => {
    const orgId = await seedOrg();
    await seedUser("u_kelvin", "Kelvin");
    await recordAudit(db, {
      organizationId: orgId,
      actor: userActor("u_kelvin", "Kelvin"),
      entityType: "company",
      entityId: "c_1",
      action: "create",
      changes: { after: { name: "Acme" } },
    });
    const rows = await db.select().from(auditLog);
    expect(rows.length).toBe(1);
    const r = rows[0]!;
    expect(r.organizationId).toBe(orgId);
    expect(r.actorType).toBe("user");
    expect(r.actorUserId).toBe("u_kelvin");
    expect(r.actorUserName).toBe("Kelvin");
    expect(r.entityType).toBe("company");
    expect(r.entityId).toBe("c_1");
    expect(r.action).toBe("create");
    expect(r.changes).toEqual({ after: { name: "Acme" } });
  });

  test("recordAudit with invalid entityType swallows the Zod error", async () => {
    const orgId = await seedOrg();
    await recordAudit(db, {
      organizationId: orgId,
      actor: userActor("u_x", null),
      // @ts-expect-error — intentionally invalid
      entityType: "not_a_real_type",
      entityId: "x",
      action: "create",
    });
    const rows = await db.select().from(auditLog);
    expect(rows.length).toBe(0);
  });

  test("recordAudit redacts tokenHash for service_token entity_type", async () => {
    const orgId = await seedOrg();
    await seedUser("u_x", "X");
    await recordAudit(db, {
      organizationId: orgId,
      actor: userActor("u_x", "X"),
      entityType: "service_token",
      entityId: "tok_1",
      action: "create",
      changes: {
        after: { id: "tok_1", name: "CI", tokenHash: "should_not_be_stored" },
      },
    });
    const rows = await db.select().from(auditLog);
    const after = (rows[0]!.changes as { after: Record<string, unknown> }).after;
    expect(after.tokenHash).toBeUndefined();
    expect(after.id).toBe("tok_1");
    expect(after.name).toBe("CI");
  });

  test("recordAudit fails soft when the insert throws", async () => {
    const orgId = await seedOrg();
    // FK violation: actorUserId references a user that doesn't exist.
    // Should log + swallow, not throw.
    const actor: Actor = {
      type: "user",
      userId: "u_nonexistent",
      userName: null,
      tokenId: null,
      tokenName: null,
      clientId: null,
    };
    await recordAudit(db, {
      organizationId: orgId,
      actor,
      entityType: "company",
      entityId: "c_x",
      action: "create",
    });
    const rows = await db.select().from(auditLog);
    expect(rows.length).toBe(0);
  });

  test("diffChangedFields returns only fields that differ", () => {
    const before = { a: 1, b: "x", c: true, d: null };
    const after = { a: 1, b: "y", c: true, d: 42 };
    const diff = diffChangedFields(before, after);
    expect(diff.before).toEqual({ b: "x", d: null });
    expect(diff.after).toEqual({ b: "y", d: 42 });
  });

  test("diffChangedFields treats Date instances with the same instant as equal", () => {
    const t = Date.UTC(2026, 4, 11, 12, 0, 0);
    const before = { createdAt: new Date(t), name: "Old" };
    const after = { createdAt: new Date(t), name: "New" };
    const diff = diffChangedFields(before, after);
    expect(diff.before).toEqual({ name: "Old" });
    expect(diff.after).toEqual({ name: "New" });
    expect(Object.keys(diff.before)).not.toContain("createdAt");
  });

  test("getEntityAudit returns rows newest-first scoped to org + entity", async () => {
    const orgA = await seedOrg("org_a");
    const orgB = await seedOrg("org_b");
    await seedUser("u_1", "Alice");
    for (const action of ["create", "update", "update"] as const) {
      await recordAudit(db, {
        organizationId: orgA,
        actor: userActor("u_1", "Alice"),
        entityType: "company",
        entityId: "c_1",
        action,
        changes: action === "create" ? { after: {} } : { before: {}, after: {} },
      });
    }
    await recordAudit(db, {
      organizationId: orgB,
      actor: userActor("u_1", "Alice"),
      entityType: "company",
      entityId: "c_1",
      action: "create",
      changes: { after: {} },
    });
    const rows = await getEntityAudit(db, orgA, "company", "c_1");
    expect(rows.length).toBe(3);
    expect(rows[0]!.action).toBe("update");
    expect(rows[rows.length - 1]!.action).toBe("create");
    for (const r of rows) expect(r.entityId).toBe("c_1");
  });

  test("getEntityAuditBatch groups by entityId with per-entity limit", async () => {
    const orgId = await seedOrg();
    await seedUser("u_1", "Alice");
    for (const id of ["c_1", "c_2"]) {
      for (let i = 0; i < 3; i++) {
        await recordAudit(db, {
          organizationId: orgId,
          actor: userActor("u_1", "Alice"),
          entityType: "company",
          entityId: id,
          action: i === 0 ? "create" : "update",
          changes: i === 0 ? { after: {} } : { before: {}, after: {} },
        });
      }
    }
    const grouped = await getEntityAuditBatch(db, orgId, "company", ["c_1", "c_2", "c_3"], 2);
    expect(grouped.get("c_1")!.length).toBe(2);
    expect(grouped.get("c_2")!.length).toBe(2);
    expect(grouped.get("c_3")).toEqual([]);
  });

  test("COALESCE: deleted user falls back to actor_user_name snapshot", async () => {
    const orgId = await seedOrg();
    await seedUser("u_doomed", "Departed Dan");
    await recordAudit(db, {
      organizationId: orgId,
      actor: userActor("u_doomed", "Departed Dan"),
      entityType: "company",
      entityId: "c_x",
      action: "create",
      changes: { after: {} },
    });
    await db.delete(user).where(eq(user.id, "u_doomed"));
    const rows = await getEntityAudit(db, orgId, "company", "c_x");
    expect(rows.length).toBe(1);
    expect(rows[0]!.actorUserId).toBeNull();
    expect(rows[0]!.actorUserName).toBe("Departed Dan");
  });
});
