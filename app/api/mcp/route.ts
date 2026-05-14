import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { db } from "@/db/client";
import { authenticate, unauthorizedResponse } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: "method not supported" }), {
    status: 405,
    headers: { "content-type": "application/json", Allow: "POST" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const ctx = await authenticate(request);
  if (!ctx) return unauthorizedResponse();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer({
    organizationId: ctx.organizationId,
    db: db(),
    actor: ctx.actor,
  });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

// Unauthenticated GET/DELETE need to emit the OAuth challenge so connector
// discovery can reach /.well-known/oauth-protected-resource. Authenticated
// GET/DELETE still return 405 — we don't push notifications and don't track
// sessions, so the SSE stream would only pin McpServer instances in memory.
async function challengeOrNotAllowed(request: Request): Promise<Response> {
  const ctx = await authenticate(request);
  if (!ctx) return unauthorizedResponse();
  return methodNotAllowed();
}

export const GET = challengeOrNotAllowed;
export const DELETE = challengeOrNotAllowed;
