import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import type { Actor } from "@/lib/audit";
import { env } from "@/lib/env";
import { resolveServiceToken } from "@/lib/service-tokens";

const defaultJwks = createRemoteJWKSet(new URL(`${env.APP_URL}/api/auth/jwks`));
export const MCP_RESOURCE = `${env.APP_URL}/api/mcp`;
export const MCP_ISSUER = `${env.APP_URL}/api/auth`;

export type McpAuthContext = { organizationId: string; actor: Actor };
export type AuthenticateOptions = { jwks?: JWTVerifyGetKey };

async function lookupUserName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const rows = await db()
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0]?.name ?? null;
}

export async function authenticate(
  request: Request,
  opts: AuthenticateOptions = {},
): Promise<McpAuthContext | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const svc = await resolveServiceToken(db(), token);
  if (svc) {
    const userName = await lookupUserName(svc.createdByUserId);
    return {
      organizationId: svc.organizationId,
      actor: {
        type: "service_token",
        userId: svc.createdByUserId,
        userName,
        tokenId: svc.id,
        tokenName: svc.name,
        clientId: null,
      },
    };
  }

  try {
    const { payload } = await jwtVerify(token, opts.jwks ?? defaultJwks, {
      audience: MCP_RESOURCE,
      issuer: MCP_ISSUER,
    });
    const orgId = payload.org_id;
    if (typeof orgId !== "string" || orgId.length === 0) return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    const clientId =
      typeof payload.client_id === "string" && payload.client_id.length > 0
        ? payload.client_id
        : null;
    if (!clientId) return null;
    const userName = await lookupUserName(sub);
    return {
      organizationId: orgId,
      actor: {
        type: "oauth_jwt",
        userId: sub,
        userName,
        tokenId: null,
        tokenName: null,
        clientId,
      },
    };
  } catch (err) {
    console.warn(
      "[mcp] jwt verify failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

export function unauthorizedResponse(): Response {
  const prmUrl = `${env.APP_URL}/.well-known/oauth-protected-resource`;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${prmUrl}", scope="mcp"`,
    },
  });
}
