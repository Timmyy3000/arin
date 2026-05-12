import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "@/db/client";
import { member } from "@/db/schema/auth";
import { orgInviteLink } from "@/db/schema/invite-links";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export type CreatedInviteLink = { token: string; expiresAt: Date };

export async function createInviteLink(
  db: Database,
  args: { organizationId: string; createdByUserId: string; role?: string },
): Promise<CreatedInviteLink> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(orgInviteLink).values({
    token,
    organizationId: args.organizationId,
    createdByUserId: args.createdByUserId,
    role: args.role ?? "member",
    expiresAt,
  });
  return { token, expiresAt };
}

export type ResolvedInviteLink = {
  organizationId: string;
  role: string;
  expiresAt: Date;
};

export async function resolveInviteLink(
  db: Database,
  token: string,
): Promise<ResolvedInviteLink | null> {
  const rows = await db
    .select({
      organizationId: orgInviteLink.organizationId,
      role: orgInviteLink.role,
      expiresAt: orgInviteLink.expiresAt,
      usedAt: orgInviteLink.usedAt,
      revokedAt: orgInviteLink.revokedAt,
    })
    .from(orgInviteLink)
    .where(eq(orgInviteLink.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.usedAt || row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return {
    organizationId: row.organizationId,
    role: row.role,
    expiresAt: row.expiresAt,
  };
}

export type ConsumedInvite = { organizationId: string; role: string };

export async function consumeInviteLink(
  db: Database,
  args: { token: string; userId: string },
): Promise<ConsumedInvite | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx
      .update(orgInviteLink)
      .set({ usedAt: now, usedByUserId: args.userId })
      .where(
        and(
          eq(orgInviteLink.token, args.token),
          isNull(orgInviteLink.usedAt),
          isNull(orgInviteLink.revokedAt),
          gt(orgInviteLink.expiresAt, now),
        ),
      )
      .returning({
        organizationId: orgInviteLink.organizationId,
        role: orgInviteLink.role,
      });
    const claim = claimed[0];
    if (!claim) return null;

    const existing = await tx
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, args.userId),
          eq(member.organizationId, claim.organizationId),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      await tx.insert(member).values({
        id: randomUUID(),
        userId: args.userId,
        organizationId: claim.organizationId,
        role: claim.role,
      });
    }
    return { organizationId: claim.organizationId, role: claim.role };
  });
}

export async function revokeInviteLink(
  db: Database,
  args: { organizationId: string; token: string },
): Promise<boolean> {
  const updated = await db
    .update(orgInviteLink)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(orgInviteLink.token, args.token),
        eq(orgInviteLink.organizationId, args.organizationId),
        isNull(orgInviteLink.revokedAt),
      ),
    )
    .returning({ token: orgInviteLink.token });
  return updated.length > 0;
}

export type ActiveInviteLink = {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  createdByUserId: string;
  role: string;
};

export async function listActiveInviteLinks(
  db: Database,
  organizationId: string,
): Promise<ActiveInviteLink[]> {
  const now = new Date();
  return db
    .select({
      token: orgInviteLink.token,
      expiresAt: orgInviteLink.expiresAt,
      createdAt: orgInviteLink.createdAt,
      createdByUserId: orgInviteLink.createdByUserId,
      role: orgInviteLink.role,
    })
    .from(orgInviteLink)
    .where(
      and(
        eq(orgInviteLink.organizationId, organizationId),
        isNull(orgInviteLink.usedAt),
        isNull(orgInviteLink.revokedAt),
        gt(orgInviteLink.expiresAt, now),
      ),
    )
    .orderBy(desc(orgInviteLink.createdAt));
}
