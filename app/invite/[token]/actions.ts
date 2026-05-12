"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { consumeInviteLink } from "@/lib/invite-links";
import { requireSession } from "@/lib/session";

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) throw new Error("token required");
  const session = await requireSession();
  const claim = await consumeInviteLink(db(), { token, userId: session.user.id });
  if (!claim) {
    redirect(`/invite/${token}?status=failed`);
  }
  await auth.api.setActiveOrganization({
    body: { organizationId: claim.organizationId },
    headers: await headers(),
  });
  redirect("/");
}
