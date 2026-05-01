"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { notes } from "@/db/schema/notes";
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
  await db().insert(notes).values({
    organizationId: session.organizationId,
    companyId,
    author: "user",
    authorUserId: session.user.id,
    body,
  });
  revalidatePath(`/companies/${companyId}/notes`);
  revalidatePath(`/companies/${companyId}`);
}
