"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { member } from "@/db/schema/auth";
import { env } from "@/lib/env";
import { createInviteLink, revokeInviteLink } from "@/lib/invite-links";
import { requireOrgSession } from "@/lib/session";

async function requireAdminRole(userId: string, organizationId: string): Promise<void> {
  const rows = await db()
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
    )
    .limit(1);
  const role = rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("Only admins or owners can manage invite links");
  }
}

export async function createInviteLinkAction(): Promise<{ url: string }> {
  const session = await requireOrgSession();
  await requireAdminRole(session.user.id, session.organizationId);
  const { token } = await createInviteLink(db(), {
    organizationId: session.organizationId,
    createdByUserId: session.user.id,
  });
  revalidatePath("/settings/members");
  return { url: `${env.APP_URL}/invite/${token}` };
}

export async function revokeInviteLinkAction(token: string): Promise<void> {
  if (!token) throw new Error("token required");
  const session = await requireOrgSession();
  await requireAdminRole(session.user.id, session.organizationId);
  await revokeInviteLink(db(), {
    organizationId: session.organizationId,
    token,
  });
  revalidatePath("/settings/members");
}
