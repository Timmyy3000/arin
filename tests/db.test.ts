import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { companies, organization } from "@/db/schema";
import { resetDb, testDb } from "./setup";

describe("schema", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("organization can be inserted and read back", async () => {
    await testDb.insert(organization).values({ id: "org_1", name: "Acme", slug: "acme" });
    const rows = await testDb.select().from(organization).where(eq(organization.slug, "acme"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Acme");
  });

  test("companies are scoped to an organization via FK", async () => {
    await testDb.insert(organization).values({ id: "org_2", name: "Acme", slug: "acme" });
    await testDb.insert(companies).values({
      organizationId: "org_2",
      name: "Stripe",
      domain: "stripe.com",
    });
    const rows = await testDb.select().from(companies);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Stripe");
  });

  test("companies.domain is unique per organization", async () => {
    await testDb.insert(organization).values({ id: "org_3", name: "Acme", slug: "acme" });
    await testDb.insert(companies).values({
      organizationId: "org_3",
      name: "Stripe",
      domain: "stripe.com",
    });
    let caught: { code?: string; constraint_name?: string } | undefined;
    try {
      await testDb.insert(companies).values({
        organizationId: "org_3",
        name: "Stripe Duplicate",
        domain: "stripe.com",
      });
    } catch (err) {
      caught = (err as Error & { cause?: unknown }).cause as never;
    }
    expect(caught?.code).toBe("23505");
    expect(caught?.constraint_name).toBe("companies_org_domain_unique");
  });

  test("same domain allowed across different organizations", async () => {
    await testDb.insert(organization).values({ id: "org_a", name: "A", slug: "a" });
    await testDb.insert(organization).values({ id: "org_b", name: "B", slug: "b" });
    await testDb
      .insert(companies)
      .values({ organizationId: "org_a", name: "Stripe", domain: "stripe.com" });
    await testDb
      .insert(companies)
      .values({ organizationId: "org_b", name: "Stripe", domain: "stripe.com" });
    const rows = await testDb.select().from(companies);
    expect(rows).toHaveLength(2);
  });
});
