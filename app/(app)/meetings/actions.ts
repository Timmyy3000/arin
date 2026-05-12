"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { recordAudit, userActor } from "@/lib/audit";
import { deleteMeeting } from "@/lib/meetings";
import { requireOrgSession } from "@/lib/session";

export async function deleteMeetingAction(input: {
  meetingId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const meetingId = z.string().uuid().parse(input.meetingId);

  const result = await deleteMeeting(db(), session.organizationId, meetingId);
  if (!result) return { ok: false, message: "Meeting not found" };

  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "meeting",
    entityId: meetingId,
    action: "delete",
    changes: { before: result.before },
  });

  revalidatePath("/meetings");
  revalidatePath(`/companies/${result.before.companyId}`);
  return { ok: true };
}
