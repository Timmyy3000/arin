import { and, count, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { people } from "@/db/schema/companies";
import { notes } from "@/db/schema/notes";
import { tasks } from "@/db/schema/tasks";

export type Person = typeof people.$inferSelect;

export type PersonCascadeChildren = {
  taskIds: string[];
  noteIds: string[];
};

export type PersonCascadeCounts = {
  tasks: number;
  notes: number;
};

export async function previewPersonDelete(
  db: Database,
  organizationId: string,
  personId: string,
): Promise<PersonCascadeCounts | null> {
  const [exists] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.organizationId, organizationId)))
    .limit(1);
  if (!exists) return null;
  const [taskCount, noteCount] = await Promise.all([
    db.select({ n: count() }).from(tasks).where(eq(tasks.personId, personId)),
    db.select({ n: count() }).from(notes).where(eq(notes.personId, personId)),
  ]);
  return {
    tasks: taskCount[0]?.n ?? 0,
    notes: noteCount[0]?.n ?? 0,
  };
}

export async function deletePerson(
  db: Database,
  organizationId: string,
  personId: string,
): Promise<{ before: Person; children: PersonCascadeChildren } | null> {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(people)
      .where(and(eq(people.id, personId), eq(people.organizationId, organizationId)))
      .limit(1);
    if (!before) return null;

    const [taskIds, noteIds] = await Promise.all([
      tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.personId, personId)),
      tx.select({ id: notes.id }).from(notes).where(eq(notes.personId, personId)),
    ]);
    await tx.delete(people).where(eq(people.id, personId));
    return {
      before,
      children: {
        taskIds: taskIds.map((r) => r.id),
        noteIds: noteIds.map((r) => r.id),
      },
    };
  });
}
