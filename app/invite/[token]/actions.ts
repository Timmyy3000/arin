"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { member } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { consumeInviteLink, resolveInviteLink } from "@/lib/invite-links";
import { requireSession } from "@/lib/session";

async function setActiveOrg(organizationId: string): Promise<void> {
  await auth.api.setActiveOrganization({
    body: { organizationId },
    headers: await headers(),
  });
}

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) throw new Error("token required");
  const session = await requireSession();

  const resolved = await resolveInviteLink(db(), token);
  if (!resolved) {
    redirect(`/invite/${token}?status=failed`);
  }

  const existing = await db()
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, resolved.organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await setActiveOrg(resolved.organizationId);
    redirect("/");
  }

  let claim: { organizationId: string; role: string } | null;
  try {
    claim = await consumeInviteLink(db(), {
      token,
      userId: session.user.id,
    });
  } catch (err) {
    console.warn(
      "[invite] consume failed:",
      err instanceof Error ? err.message : String(err),
    );
    redirect(`/invite/${token}?status=failed`);
  }
  if (!claim) {
    redirect(`/invite/${token}?status=failed`);
  }
  await setActiveOrg(claim.organizationId);
  redirect("/");
}

export async function switchToOrgAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organization_id") ?? "");
  if (!organizationId) throw new Error("organization_id required");
  const session = await requireSession();
  const existing = await db()
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (existing.length === 0) {
    throw new Error("Not a member of that organization");
  }
  await setActiveOrg(organizationId);
  redirect("/");
}
