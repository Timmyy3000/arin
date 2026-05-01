"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { tasks } from "@/db/schema/tasks";
import { requireOrgSession } from "@/lib/session";

const StatusSchema = z.enum(["open", "done", "dismissed"]);

export async function setTaskStatusAction(formData: FormData): Promise<void> {
  const session = await requireOrgSession();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = StatusSchema.parse(formData.get("status"));
  await db()
    .update(tasks)
    .set({
      status,
      completedAt: status === "open" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId)));
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/companies");
}
