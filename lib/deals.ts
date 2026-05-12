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
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, organizationId)))
    .limit(1);
  if (!before) return null;
  await db.delete(deals).where(eq(deals.id, dealId));
  return { before };
}
