"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { issueServiceToken, revokeServiceToken } from "@/lib/service-tokens";
import { requireOrgSession } from "@/lib/session";

const NameSchema = z.string().trim().min(1).max(80);

export async function issueServiceTokenAction(
  formData: FormData,
): Promise<{ id: string; token: string }> {
  const session = await requireOrgSession();
  const name = NameSchema.parse(formData.get("name"));
  const result = await issueServiceToken(db(), session.organizationId, name);
  revalidatePath("/settings/tokens");
  return result;
}

export async function revokeServiceTokenAction(formData: FormData): Promise<void> {
  const session = await requireOrgSession();
  const id = z.string().min(1).parse(formData.get("id"));
  await revokeServiceToken(db(), session.organizationId, id);
  revalidatePath("/settings/tokens");
}
