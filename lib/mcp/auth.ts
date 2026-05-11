import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { resolveServiceToken } from "@/lib/service-tokens";

const defaultJwks = createRemoteJWKSet(new URL(`${env.APP_URL}/api/auth/jwks`));
export const MCP_RESOURCE = `${env.APP_URL}/api/mcp`;

export type McpAuthContext = { organizationId: string };
export type AuthenticateOptions = { jwks?: JWTVerifyGetKey };

export async function authenticate(
  request: Request,
  opts: AuthenticateOptions = {},
): Promise<McpAuthContext | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const svc = await resolveServiceToken(db(), token);
  if (svc) return { organizationId: svc.organizationId };

  try {
    const { payload } = await jwtVerify(token, opts.jwks ?? defaultJwks, {
      audience: MCP_RESOURCE,
      issuer: env.APP_URL,
    });
    const orgId = payload.org_id;
    if (typeof orgId !== "string" || orgId.length === 0) return null;
    return { organizationId: orgId };
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
