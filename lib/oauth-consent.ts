import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { oauthConsentScope } from "@/db/schema";

const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function recordConsentChoice(input: {
  consentCode: string;
  userId: string;
  organizationId: string;
  resource: string;
}): Promise<void> {
  await db()
    .insert(oauthConsentScope)
    .values({
      consentCode: input.consentCode,
      userId: input.userId,
      organizationId: input.organizationId,
      resource: input.resource,
      expiresAt: new Date(Date.now() + CONSENT_TTL_MS),
    })
    .onConflictDoUpdate({
      target: oauthConsentScope.consentCode,
      set: {
        organizationId: input.organizationId,
        resource: input.resource,
        expiresAt: new Date(Date.now() + CONSENT_TTL_MS),
      },
    });
}

export async function resolveConsentOrg(
  userId: string,
  resource: string | undefined,
): Promise<string | null> {
  if (!resource) return null;
  const rows = await db()
    .select({ organizationId: oauthConsentScope.organizationId })
    .from(oauthConsentScope)
    .where(
      and(
        eq(oauthConsentScope.userId, userId),
        eq(oauthConsentScope.resource, resource),
        gt(oauthConsentScope.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(oauthConsentScope.createdAt))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}
