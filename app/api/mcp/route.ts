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

// Stateless server doesn't push notifications and has no sessions to terminate,
// so refuse the GET SSE stream and DELETE — both would only allocate without value
// and GET in particular leaks McpServer instances by holding them open indefinitely.
export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
