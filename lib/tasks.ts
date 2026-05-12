import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { tasks } from "@/db/schema/tasks";

export type Task = typeof tasks.$inferSelect;

export async function deleteTask(
  db: Database,
  organizationId: string,
  taskId: string,
): Promise<{ before: Task } | null> {
  const [before] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)))
    .returning();
  return before ? { before } : null;
}
