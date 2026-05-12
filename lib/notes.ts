import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { notes } from "@/db/schema/notes";

export type Note = typeof notes.$inferSelect;

export async function deleteNote(
  db: Database,
  organizationId: string,
  noteId: string,
): Promise<{ before: Note } | null> {
  const [before] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.organizationId, organizationId)))
    .limit(1);
  if (!before) return null;
  await db.delete(notes).where(eq(notes.id, noteId));
  return { before };
}
