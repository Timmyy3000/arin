"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { recordAudit, userActor } from "@/lib/audit";
import { issueServiceToken, revokeServiceToken } from "@/lib/service-tokens";
import { requireOrgSession } from "@/lib/session";

const NameSchema = z.string().trim().min(1).max(80);

export async function issueServiceTokenAction(
  formData: FormData,
): Promise<{ id: string; token: string }> {
  const session = await requireOrgSession();
  const name = NameSchema.parse(formData.get("name"));
  const result = await issueServiceToken(
    db(),
    session.organizationId,
    name,
    session.user.id,
  );
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "service_token",
    entityId: result.id,
    action: "create",
    changes: { after: { id: result.id, name, createdByUserId: session.user.id } },
  });
  revalidatePath("/settings/tokens");
  return result;
}

export async function revokeServiceTokenAction(formData: FormData): Promise<void> {
  const session = await requireOrgSession();
  const id = z.string().min(1).parse(formData.get("id"));
  await revokeServiceToken(db(), session.organizationId, id);
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor: userActor(session.user.id, session.user.name ?? null),
    entityType: "service_token",
    entityId: id,
    action: "update",
    changes: { before: { revokedAt: null }, after: { revokedAt: new Date().toISOString() } },
  });
  revalidatePath("/settings/tokens");
}
