import { beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { member, organization, user } from "@/db/schema/auth";
import { orgInviteLink } from "@/db/schema/invite-links";
import {
  consumeInviteLink,
  createInviteLink,
  generateInviteToken,
  listActiveInviteLinks,
  resolveInviteLink,
  revokeInviteLink,
} from "@/lib/invite-links";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(): Promise<{ orgId: string; adminId: string; joinerId: string }> {
  const orgId = "org_invite";
  const adminId = "user_admin";
  const joinerId = "user_joiner";
  await db.insert(organization).values({ id: orgId, name: "Invite Org", slug: "invite-org" });
  await db.insert(user).values([
    { id: adminId, name: "Admin", email: "admin@example.com" },
    { id: joinerId, name: "Joiner", email: "joiner@example.com" },
  ]);
  await db
    .insert(member)
    .values({ id: "m_admin", userId: adminId, organizationId: orgId, role: "owner" });
  return { orgId, adminId, joinerId };
}

describe("invite links", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("generateInviteToken returns a URL-safe high-entropy string", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThan(32);
  });

  test("createInviteLink stores a row with a 7d expiry", async () => {
    const { orgId, adminId } = await seed();
    const before = Date.now();
    const { token, expiresAt } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(sevenDaysMs - 1000);
    expect(expiresAt.getTime() - before).toBeLessThanOrEqual(sevenDaysMs + 1000);
    const rows = await db
      .select()
      .from(orgInviteLink)
      .where(eq(orgInviteLink.token, token));
    expect(rows[0]?.role).toBe("member");
    expect(rows[0]?.usedAt).toBeNull();
    expect(rows[0]?.revokedAt).toBeNull();
  });

  test("resolveInviteLink returns org+role for a fresh link", async () => {
    const { orgId, adminId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const resolved = await resolveInviteLink(db, token);
    expect(resolved?.organizationId).toBe(orgId);
    expect(resolved?.role).toBe("member");
  });

  test("resolveInviteLink returns null for an unknown token", async () => {
    expect(await resolveInviteLink(db, "nope")).toBeNull();
  });

  test("resolveInviteLink returns null for an expired link", async () => {
    const { orgId, adminId } = await seed();
    const token = generateInviteToken();
    await db.insert(orgInviteLink).values({
      token,
      organizationId: orgId,
      createdByUserId: adminId,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await resolveInviteLink(db, token)).toBeNull();
  });

  test("resolveInviteLink returns null for a used link", async () => {
    const { orgId, adminId, joinerId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    await consumeInviteLink(db, { token, userId: joinerId });
    expect(await resolveInviteLink(db, token)).toBeNull();
  });

  test("resolveInviteLink returns null for a revoked link", async () => {
    const { orgId, adminId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    await revokeInviteLink(db, { organizationId: orgId, token });
    expect(await resolveInviteLink(db, token)).toBeNull();
  });

  test("consumeInviteLink atomically claims and inserts a member row", async () => {
    const { orgId, adminId, joinerId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const claim = await consumeInviteLink(db, { token, userId: joinerId });
    expect(claim?.organizationId).toBe(orgId);
    expect(claim?.role).toBe("member");
    const memberRows = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, joinerId), eq(member.organizationId, orgId)));
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]?.role).toBe("member");
  });

  test("consumeInviteLink racing: only one of two parallel claims wins", async () => {
    const { orgId, adminId, joinerId } = await seed();
    const otherUserId = "user_other";
    await db.insert(user).values({
      id: otherUserId,
      name: "Other",
      email: "other@example.com",
    });
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const [a, b] = await Promise.all([
      consumeInviteLink(db, { token, userId: joinerId }),
      consumeInviteLink(db, { token, userId: otherUserId }),
    ]);
    const wins = [a, b].filter((r) => r !== null);
    expect(wins).toHaveLength(1);
    const memberRows = await db
      .select()
      .from(member)
      .where(eq(member.organizationId, orgId));
    expect(memberRows).toHaveLength(2);
  });

  test("consumeInviteLink is idempotent if the user is already a member", async () => {
    const { orgId, adminId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const claim = await consumeInviteLink(db, { token, userId: adminId });
    expect(claim?.organizationId).toBe(orgId);
    const memberRows = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, adminId), eq(member.organizationId, orgId)));
    expect(memberRows).toHaveLength(1);
  });

  test("consumeInviteLink rolls back the claim when the member insert fails", async () => {
    const { orgId, adminId } = await seed();
    const { token } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    await expect(
      consumeInviteLink(db, { token, userId: "user_does_not_exist" }),
    ).rejects.toThrow();
    const rows = await db
      .select({ usedAt: orgInviteLink.usedAt, usedByUserId: orgInviteLink.usedByUserId })
      .from(orgInviteLink)
      .where(eq(orgInviteLink.token, token));
    expect(rows[0]?.usedAt).toBeNull();
    expect(rows[0]?.usedByUserId).toBeNull();
  });

  test("consumeInviteLink returns null for an unknown / expired / used / revoked token", async () => {
    const { orgId, adminId, joinerId } = await seed();
    expect(await consumeInviteLink(db, { token: "missing", userId: joinerId })).toBeNull();

    const expired = generateInviteToken();
    await db.insert(orgInviteLink).values({
      token: expired,
      organizationId: orgId,
      createdByUserId: adminId,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await consumeInviteLink(db, { token: expired, userId: joinerId })).toBeNull();

    const revoked = generateInviteToken();
    await db.insert(orgInviteLink).values({
      token: revoked,
      organizationId: orgId,
      createdByUserId: adminId,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
    });
    expect(await consumeInviteLink(db, { token: revoked, userId: joinerId })).toBeNull();
  });

  test("revokeInviteLink only affects links belonging to the caller org", async () => {
    const { orgId, adminId } = await seed();
    const otherOrgId = "org_other";
    await db
      .insert(organization)
      .values({ id: otherOrgId, name: "Other", slug: "other" });
    const { token: ours } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const theirs = generateInviteToken();
    await db.insert(orgInviteLink).values({
      token: theirs,
      organizationId: otherOrgId,
      createdByUserId: adminId,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const ok = await revokeInviteLink(db, { organizationId: orgId, token: theirs });
    expect(ok).toBe(false);
    const stillActive = await db
      .select()
      .from(orgInviteLink)
      .where(eq(orgInviteLink.token, theirs));
    expect(stillActive[0]?.revokedAt).toBeNull();

    const ok2 = await revokeInviteLink(db, { organizationId: orgId, token: ours });
    expect(ok2).toBe(true);
  });

  test("listActiveInviteLinks excludes used / expired / revoked", async () => {
    const { orgId, adminId, joinerId } = await seed();
    const { token: active } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    const { token: toUse } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    await consumeInviteLink(db, { token: toUse, userId: joinerId });
    const { token: toRevoke } = await createInviteLink(db, {
      organizationId: orgId,
      createdByUserId: adminId,
    });
    await revokeInviteLink(db, { organizationId: orgId, token: toRevoke });
    const expiredToken = generateInviteToken();
    await db.insert(orgInviteLink).values({
      token: expiredToken,
      organizationId: orgId,
      createdByUserId: adminId,
      expiresAt: new Date(Date.now() - 1000),
    });

    const rows = await listActiveInviteLinks(db, orgId);
    expect(rows.map((r) => r.token)).toEqual([active]);
  });
});
