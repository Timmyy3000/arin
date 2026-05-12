"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { tasks } from "@/db/schema/tasks";
import { diffChangedFields, recordAudit, userActor } from "@/lib/audit";
import { requireOrgSession } from "@/lib/session";
import { deleteTask } from "@/lib/tasks";

const StatusSchema = z.enum(["open", "done", "dismissed"]);

export async function setTaskStatusAction(formData: FormData): Promise<void> {
  const session = await requireOrgSession();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = StatusSchema.parse(formData.get("status"));
  const before = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId)))
    .limit(1);
  if (!before[0]) return;
  const [row] = await db()
    .update(tasks)
    .set({
      status,
      completedAt: status === "open" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId)))
    .returning();
  if (!row) return;
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "task",
    entityId: row.id,
    action: "update",
    changes: diffChangedFields(before[0], row),
  });
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/companies");
}

export async function deleteTaskAction(input: {
  taskId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const taskId = z.string().uuid().parse(input.taskId);

  const result = await deleteTask(db(), session.organizationId, taskId);
  if (!result) return { ok: false, message: "Task not found" };

  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "task",
    entityId: taskId,
    action: "delete",
    changes: { before: result.before },
  });

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/companies");
  if (result.before.companyId) {
    revalidatePath(`/companies/${result.before.companyId}/tasks`);
    revalidatePath(`/companies/${result.before.companyId}`);
  }
  return { ok: true };
}
