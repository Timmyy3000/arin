import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";

export const getOrgName = cache(async (organizationId: string): Promise<string> => {
  const rows = await db()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return rows[0]?.name ?? "Workspace";
});

export const getCompanyById = cache(
  async (id: string, organizationId: string) => {
    const rows = await db()
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.organizationId, organizationId)))
      .limit(1);
    return rows[0] ?? null;
  },
);
