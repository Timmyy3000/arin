import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { deals } from "@/db/schema/deals";

export type Deal = typeof deals.$inferSelect;

export async function deleteDeal(
  db: Database,
  organizationId: string,
  dealId: string,
): Promise<{ before: Deal } | null> {
  const [before] = await db
    .delete(deals)
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)))
    .returning();
  return before ? { before } : null;
}
