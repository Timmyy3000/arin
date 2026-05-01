import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { member } from "@/db/schema/auth";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireOrgSession() {
  const session = await requireSession();
  let organizationId = session.session.activeOrganizationId ?? null;

  if (!organizationId) {
    const memberships = await db()
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1);
    organizationId = memberships[0]?.organizationId ?? null;
  }

  if (!organizationId) redirect("/onboarding");
  return { ...session, organizationId };
}
