import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { organization, user } from "@/db/schema/auth";
import { oauthConsentScope } from "@/db/schema/oauth-consent";
import { recordConsentChoice, resolveConsentOrg } from "@/lib/oauth-consent";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seedUserAndOrgs(orgIds: string[]): Promise<string> {
  const userId = "user_consent";
  await db
    .insert(user)
    .values({ id: userId, name: "Consent User", email: "consent@example.com" });
  for (const id of orgIds) {
    await db.insert(organization).values({ id, name: id.toUpperCase(), slug: id });
  }
  return userId;
}

const RESOURCE = "http://localhost:3000/api/mcp";

describe("oauth consent storage", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("recordConsentChoice stores a row keyed by consent_code", async () => {
    const userId = await seedUserAndOrgs(["org_a"]);
    await recordConsentChoice({
      consentCode: "code_1",
      userId,
      organizationId: "org_a",
      resource: RESOURCE,
    });
    const rows = await db
      .select()
      .from(oauthConsentScope)
      .where(eq(oauthConsentScope.consentCode, "code_1"));
    expect(rows[0]?.organizationId).toBe("org_a");
    expect(rows[0]?.resource).toBe(RESOURCE);
    expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("re-recording the same consent_code updates the choice", async () => {
    const userId = await seedUserAndOrgs(["org_a", "org_b"]);
    await recordConsentChoice({
      consentCode: "code_1",
      userId,
      organizationId: "org_a",
      resource: RESOURCE,
    });
    await recordConsentChoice({
      consentCode: "code_1",
      userId,
      organizationId: "org_b",
      resource: RESOURCE,
    });
    const rows = await db
      .select()
      .from(oauthConsentScope)
      .where(eq(oauthConsentScope.consentCode, "code_1"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.organizationId).toBe("org_b");
  });

  test("resolveConsentOrg returns the most recent unexpired choice for user+resource", async () => {
    const userId = await seedUserAndOrgs(["org_a", "org_b"]);
    await recordConsentChoice({
      consentCode: "code_old",
      userId,
      organizationId: "org_a",
      resource: RESOURCE,
    });
    await new Promise((r) => setTimeout(r, 10));
    await recordConsentChoice({
      consentCode: "code_new",
      userId,
      organizationId: "org_b",
      resource: RESOURCE,
    });
    const resolved = await resolveConsentOrg(userId, RESOURCE);
    expect(resolved).toBe("org_b");
  });

  test("resolveConsentOrg ignores choices for a different resource", async () => {
    const userId = await seedUserAndOrgs(["org_a"]);
    await recordConsentChoice({
      consentCode: "code_1",
      userId,
      organizationId: "org_a",
      resource: "http://localhost:3000/api/other",
    });
    const resolved = await resolveConsentOrg(userId, RESOURCE);
    expect(resolved).toBeNull();
  });

  test("resolveConsentOrg returns null when no consent has been recorded", async () => {
    const userId = await seedUserAndOrgs(["org_a"]);
    const resolved = await resolveConsentOrg(userId, RESOURCE);
    expect(resolved).toBeNull();
  });

  test("resolveConsentOrg returns null when the row has expired", async () => {
    const userId = await seedUserAndOrgs(["org_a"]);
    await db.insert(oauthConsentScope).values({
      consentCode: "code_expired",
      userId,
      organizationId: "org_a",
      resource: RESOURCE,
      expiresAt: new Date(Date.now() - 1000),
    });
    const resolved = await resolveConsentOrg(userId, RESOURCE);
    expect(resolved).toBeNull();
  });

  test("resolveConsentOrg returns null when resource is undefined", async () => {
    const userId = await seedUserAndOrgs(["org_a"]);
    await recordConsentChoice({
      consentCode: "code_1",
      userId,
      organizationId: "org_a",
      resource: RESOURCE,
    });
    const resolved = await resolveConsentOrg(userId, undefined);
    expect(resolved).toBeNull();
  });
});
