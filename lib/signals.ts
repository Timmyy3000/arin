import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { signals } from "@/db/schema/signals";

export type Signal = typeof signals.$inferSelect;

export async function deleteSignal(
  db: Database,
  organizationId: string,
  signalId: string,
): Promise<{ before: Signal } | null> {
  const [before] = await db
    .select()
    .from(signals)
    .where(and(eq(signals.id, signalId), eq(signals.organizationId, organizationId)))
    .limit(1);
  if (!before) return null;
  await db.delete(signals).where(eq(signals.id, signalId));
  return { before };
}
