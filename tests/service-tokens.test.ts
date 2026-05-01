import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { serviceTokens } from "@/db/schema/settings";
import {
  generateToken,
  hashToken,
  issueServiceToken,
  resolveServiceToken,
  revokeServiceToken,
} from "@/lib/service-tokens";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seedOrg(id = "org_st", slug = "st"): Promise<string> {
  await db.insert(organization).values({ id, name: "ST", slug });
  return id;
}

describe("service tokens", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("generated tokens are prefixed and high-entropy", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^arin_/);
    expect(b).toMatch(/^arin_/);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  test("hashToken is deterministic and not reversible", () => {
    const t = "arin_known_value";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain("known_value");
  });

  test("issueServiceToken stores hash, returns plaintext once", async () => {
    const orgId = await seedOrg();
    const issued = await issueServiceToken(db, orgId, "ci-bot");
    expect(issued.token).toMatch(/^arin_/);

    const rows = await db.select().from(serviceTokens).where(eq(serviceTokens.id, issued.id));
    expect(rows[0]?.tokenHash).toBe(hashToken(issued.token));
    expect(rows[0]?.tokenHash).not.toBe(issued.token);
  });

  test("resolveServiceToken returns org id and bumps last_used_at", async () => {
    const orgId = await seedOrg();
    const issued = await issueServiceToken(db, orgId, "ci-bot");
    const resolved = await resolveServiceToken(db, issued.token);
    expect(resolved?.organizationId).toBe(orgId);
    expect(resolved?.id).toBe(issued.id);

    const rows = await db.select().from(serviceTokens).where(eq(serviceTokens.id, issued.id));
    expect(rows[0]?.lastUsedAt).not.toBeNull();
  });

  test("resolveServiceToken returns null for unknown tokens", async () => {
    const resolved = await resolveServiceToken(db, "arin_does_not_exist");
    expect(resolved).toBeNull();
  });

  test("resolveServiceToken returns null when prefix is missing", async () => {
    const resolved = await resolveServiceToken(db, "not_an_arin_token");
    expect(resolved).toBeNull();
  });

  test("revokeServiceToken makes the token unresolvable", async () => {
    const orgId = await seedOrg();
    const issued = await issueServiceToken(db, orgId, "ci-bot");
    await revokeServiceToken(db, orgId, issued.id);
    const resolved = await resolveServiceToken(db, issued.token);
    expect(resolved).toBeNull();
  });
});
