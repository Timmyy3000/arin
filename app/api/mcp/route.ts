import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { db } from "@/db/client";
import { createMcpServer } from "@/lib/mcp/server";
import { resolveServiceToken } from "@/lib/service-tokens";

function unauthorized(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

async function handleMcp(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return unauthorized("missing bearer token");
  }
  const token = auth.slice(7).trim();
  const resolved = await resolveServiceToken(db(), token);
  if (!resolved) return unauthorized("invalid or revoked token");

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer({ organizationId: resolved.organizationId, db: db() });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleMcp(request);
}

export async function GET(request: Request): Promise<Response> {
  return handleMcp(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMcp(request);
}
