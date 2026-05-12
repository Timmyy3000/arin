"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { notes } from "@/db/schema/notes";
import { recordAudit, userActor } from "@/lib/audit";
import { deleteNote } from "@/lib/notes";
import { requireOrgSession } from "@/lib/session";

const Schema = z.object({
  companyId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
});

export async function addCompanyNoteAction(formData: FormData): Promise<void> {
  const session = await requireOrgSession();
  const { companyId, body } = Schema.parse({
    companyId: formData.get("companyId"),
    body: formData.get("body"),
  });
  const [row] = await db()
    .insert(notes)
    .values({
      organizationId: session.organizationId,
      companyId,
      author: "user",
      authorUserId: session.user.id,
      body,
    })
    .returning();
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "note",
    entityId: row.id,
    action: "create",
    changes: { after: row },
  });
  revalidatePath(`/companies/${companyId}/notes`);
  revalidatePath(`/companies/${companyId}`);
}

export async function deleteNoteAction(input: {
  noteId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const noteId = z.string().uuid().parse(input.noteId);

  const result = await deleteNote(db(), session.organizationId, noteId);
  if (!result) return { ok: false, message: "Note not found" };

  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "note",
    entityId: noteId,
    action: "delete",
    changes: { before: result.before },
  });

  if (result.before.companyId) {
    revalidatePath(`/companies/${result.before.companyId}/notes`);
    revalidatePath(`/companies/${result.before.companyId}`);
  }
  return { ok: true };
}
