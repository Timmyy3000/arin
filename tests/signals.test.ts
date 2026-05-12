import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization, user } from "@/db/schema/auth";
import { auditLog } from "@/db/schema/audit";
import { companies } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import { deleteSignal } from "@/lib/signals";
import { recordAudit, userActor } from "@/lib/audit";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_signals") {
  await db.insert(organization).values({ id: orgId, name: "Signals", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const signalId = crypto.randomUUID();
  await db.insert(signals).values({
    id: signalId,
    organizationId: orgId,
    companyId,
    type: "news",
    title: "Acme raised $10M",
    occurredAt: new Date(),
  });
  return { orgId, companyId, signalId };
}

describe("lib/signals", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("deleteSignal removes the row and returns the prior snapshot", async () => {
    const { orgId, signalId } = await seed();
    const result = await deleteSignal(db, orgId, signalId);
    expect(result?.before.id).toBe(signalId);
    const remaining = await db.select().from(signals).where(eq(signals.id, signalId));
    expect(remaining).toHaveLength(0);
  });

  test("deleteSignal returns null for cross-org signals", async () => {
    const { signalId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteSignal(db, "org_b", signalId);
    expect(result).toBeNull();
    const remaining = await db.select().from(signals).where(eq(signals.id, signalId));
    expect(remaining).toHaveLength(1);
  });

  test("delete + audit fan-out leaves a delete audit row", async () => {
    const { orgId, signalId } = await seed();
    await db.insert(user).values({ id: "u_alice", name: "Alice", email: "alice@example.com" });
    const result = await deleteSignal(db, orgId, signalId);
    expect(result).not.toBeNull();
    await recordAudit(db, {
      organizationId: orgId,
      actor: userActor("u_alice", "Alice"),
      entityType: "signal",
      entityId: signalId,
      action: "delete",
      changes: { before: result!.before },
    });
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityType, "signal"), eq(auditLog.action, "delete")));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entityId).toBe(signalId);
  });
});
