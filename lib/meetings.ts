import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { meetings } from "@/db/schema/meetings";

export type Meeting = typeof meetings.$inferSelect;

export async function deleteMeeting(
  db: Database,
  organizationId: string,
  meetingId: string,
): Promise<{ before: Meeting } | null> {
  const [before] = await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.organizationId, organizationId)))
    .returning();
  return before ? { before } : null;
}
