import { beforeEach, describe, expect, test } from "bun:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import {
  authenticate,
  MCP_ISSUER,
  MCP_RESOURCE,
  unauthorizedResponse,
} from "@/lib/mcp/auth";
import { issueServiceToken } from "@/lib/service-tokens";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);
const APP_URL = process.env.APP_URL!;
const ALG = "ES256";

async function mintJwt(opts: {
  privateKey: CryptoKey;
  kid: string;
  payload?: Record<string, unknown>;
  audience?: string | string[];
  issuer?: string;
  expSecondsFromNow?: number;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (opts.expSecondsFromNow ?? 3600);
  return new SignJWT(
    opts.payload ?? { org_id: "org_jwt", sub: "user_1", client_id: "test_client" },
  )
    .setProtectedHeader({ alg: ALG, kid: opts.kid })
    .setIssuer(opts.issuer ?? MCP_ISSUER)
    .setAudience(opts.audience ?? MCP_RESOURCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(opts.privateKey);
}

async function makeKeySet(kid: string) {
  const { publicKey, privateKey } = await generateKeyPair(ALG, { extractable: true });
  const jwk = await exportJWK(publicKey);
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid, alg: ALG, use: "sig" }] });
  return { privateKey, jwks };
}

function bearer(token: string): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("MCP dual-auth", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("unauthorizedResponse emits RFC 9728-style WWW-Authenticate", () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const wa = res.headers.get("WWW-Authenticate") ?? "";
    expect(wa).toContain("Bearer");
    expect(wa).toContain(
      `resource_metadata="${APP_URL}/.well-known/oauth-protected-resource"`,
    );
    expect(wa).toContain('scope="mcp"');
  });

  test("authenticate returns null when no bearer header is present", async () => {
    const req = new Request("http://localhost/api/mcp", { method: "POST" });
    expect(await authenticate(req)).toBeNull();
  });

  test("authenticate returns null for a non-Bearer scheme", async () => {
    const req = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Basic ZXhhbXBsZQ==" },
    });
    expect(await authenticate(req)).toBeNull();
  });

  test("authenticate returns null for an empty bearer token", async () => {
    const req = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer " },
    });
    expect(await authenticate(req)).toBeNull();
  });

  test("authenticate resolves a valid service token to its org", async () => {
    const orgId = "org_svc";
    await db.insert(organization).values({ id: orgId, name: "Svc", slug: "svc" });
    const issued = await issueServiceToken(db, orgId, "ci-bot");
    const ctx = await authenticate(bearer(issued.token));
    expect(ctx?.organizationId).toBe(orgId);
  });

  test("authenticate returns null for an unknown arin_ token", async () => {
    expect(await authenticate(bearer("arin_not_a_real_token"))).toBeNull();
  });

  test("authenticate accepts a valid JWT and returns its org_id claim", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({
      privateKey,
      kid: "k1",
      payload: { org_id: "org_jwt", sub: "user_1", client_id: "test_client" },
    });
    const ctx = await authenticate(bearer(token), { jwks });
    expect(ctx?.organizationId).toBe("org_jwt");
  });

  test("authenticate rejects a JWT with the wrong audience", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({
      privateKey,
      kid: "k1",
      audience: `${APP_URL}/api/something-else`,
    });
    expect(await authenticate(bearer(token), { jwks })).toBeNull();
  });

  test("authenticate rejects a JWT with the wrong issuer", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({
      privateKey,
      kid: "k1",
      issuer: "http://evil.example",
    });
    expect(await authenticate(bearer(token), { jwks })).toBeNull();
  });

  test("authenticate rejects an expired JWT", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({ privateKey, kid: "k1", expSecondsFromNow: -10 });
    expect(await authenticate(bearer(token), { jwks })).toBeNull();
  });

  test("authenticate rejects a JWT signed by a different key", async () => {
    const { privateKey } = await makeKeySet("k1");
    const { jwks: otherJwks } = await makeKeySet("k2");
    const token = await mintJwt({ privateKey, kid: "k1" });
    expect(await authenticate(bearer(token), { jwks: otherJwks })).toBeNull();
  });

  test("authenticate rejects a JWT with a non-string org_id claim", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({
      privateKey,
      kid: "k1",
      payload: { org_id: 42, sub: "user_1" },
    });
    expect(await authenticate(bearer(token), { jwks })).toBeNull();
  });

  test("authenticate rejects a JWT missing org_id", async () => {
    const { privateKey, jwks } = await makeKeySet("k1");
    const token = await mintJwt({
      privateKey,
      kid: "k1",
      payload: { sub: "user_1" },
    });
    expect(await authenticate(bearer(token), { jwks })).toBeNull();
  });
});

describe("MCP discovery", () => {
  test("protected resource metadata points Claude at the auth server base path", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      resource: `${APP_URL}/api/mcp`,
      authorization_servers: [`${APP_URL}/api/auth`],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
    });
  });

  test("path-aware auth server metadata route is served under /.well-known/.../api/auth", async () => {
    const { GET } = await import(
      "@/app/.well-known/oauth-authorization-server/api/auth/route"
    );
    const res = await GET(
      new Request("http://localhost/.well-known/oauth-authorization-server/api/auth", {
        method: "GET",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.issuer).toBe(`${APP_URL}/api/auth`);
    expect(body.jwks_uri).toBe(`${APP_URL}/api/auth/jwks`);
    expect(body.registration_endpoint).toBe(`${APP_URL}/api/auth/oauth2/register`);
    expect(body.authorization_endpoint).toBe(
      `${APP_URL}/api/auth/oauth2/authorize`,
    );
    expect(body.token_endpoint).toBe(`${APP_URL}/api/auth/oauth2/token`);
  });
});

describe("MCP route methods", () => {
  beforeEach(async () => {
    await resetDb();
  });

  function expectOAuthChallenge(res: Response): void {
    expect(res.status).toBe(401);
    const wa = res.headers.get("WWW-Authenticate") ?? "";
    expect(wa).toContain("Bearer");
    expect(wa).toContain(
      `resource_metadata="${APP_URL}/.well-known/oauth-protected-resource"`,
    );
  }

  test("GET /api/mcp without a token returns 401 with WWW-Authenticate", async () => {
    const { GET } = await import("@/app/api/mcp/route");
    const res = await GET(
      new Request("http://localhost/api/mcp", { method: "GET" }),
    );
    expectOAuthChallenge(res);
  });

  test("DELETE /api/mcp without a token returns 401 with WWW-Authenticate", async () => {
    const { DELETE } = await import("@/app/api/mcp/route");
    const res = await DELETE(
      new Request("http://localhost/api/mcp", { method: "DELETE" }),
    );
    expectOAuthChallenge(res);
  });

  test("GET /api/mcp with a valid service token returns 405", async () => {
    const orgId = "org_route";
    await db.insert(organization).values({ id: orgId, name: "Route", slug: "route" });
    const issued = await issueServiceToken(db, orgId, "ci-bot");
    const { GET } = await import("@/app/api/mcp/route");
    const res = await GET(
      new Request("http://localhost/api/mcp", {
        method: "GET",
        headers: { authorization: `Bearer ${issued.token}` },
      }),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });
});
