import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/db/client";
import { serviceTokens } from "@/db/schema/settings";

const TOKEN_PREFIX = "arin_";
const TOKEN_BYTES = 32;

export type IssuedServiceToken = {
  id: string;
  token: string;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function issueServiceToken(
  db: Database,
  organizationId: string,
  name: string,
): Promise<IssuedServiceToken> {
  const id = randomUUID();
  const token = generateToken();
  await db.insert(serviceTokens).values({
    id,
    organizationId,
    name,
    tokenHash: hashToken(token),
  });
  return { id, token };
}

export async function revokeServiceToken(
  db: Database,
  organizationId: string,
  id: string,
): Promise<void> {
  await db
    .update(serviceTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(serviceTokens.id, id), eq(serviceTokens.organizationId, organizationId)));
}

export type ResolvedServiceToken = {
  id: string;
  organizationId: string;
};

export async function resolveServiceToken(
  db: Database,
  token: string,
): Promise<ResolvedServiceToken | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      id: serviceTokens.id,
      organizationId: serviceTokens.organizationId,
      revokedAt: serviceTokens.revokedAt,
    })
    .from(serviceTokens)
    .where(and(eq(serviceTokens.tokenHash, tokenHash), isNull(serviceTokens.revokedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  await db
    .update(serviceTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(serviceTokens.id, row.id));

  return { id: row.id, organizationId: row.organizationId };
}
