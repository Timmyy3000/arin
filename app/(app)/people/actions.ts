"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { recordAudit, userActor } from "@/lib/audit";
import { deletePerson, previewPersonDelete, type PersonCascadeCounts } from "@/lib/people";
import { requireOrgSession } from "@/lib/session";

export async function previewPersonDeleteAction(input: {
  personId: string;
}): Promise<{ ok: true; data: PersonCascadeCounts } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const personId = z.string().uuid().parse(input.personId);
  const data = await previewPersonDelete(db(), session.organizationId, personId);
  if (!data) return { ok: false, message: "Person not found" };
  return { ok: true, data };
}

export async function deletePersonAction(input: {
  personId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const personId = z.string().uuid().parse(input.personId);

  const result = await deletePerson(db(), session.organizationId, personId);
  if (!result) return { ok: false, message: "Person not found" };

  const actor = userActor(session.user.id, session.user.name ?? null);
  for (const taskId of result.children.taskIds) {
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor,
      entityType: "task",
      entityId: taskId,
      action: "delete",
      changes: { before: { personId } },
    });
  }
  for (const noteId of result.children.noteIds) {
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor,
      entityType: "note",
      entityId: noteId,
      action: "delete",
      changes: { before: { personId } },
    });
  }
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor,
    entityType: "person",
    entityId: personId,
    action: "delete",
    changes: { before: result.before },
  });

  revalidatePath("/people");
  if (result.before.companyId) {
    revalidatePath(`/companies/${result.before.companyId}/people`);
    revalidatePath(`/companies/${result.before.companyId}`);
  }
  return { ok: true };
}
