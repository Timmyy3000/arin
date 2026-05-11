import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { db } from "@/db/client";
import { authenticate, unauthorizedResponse } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

async function handleMcp(request: Request): Promise<Response> {
  const ctx = await authenticate(request);
  if (!ctx) return unauthorizedResponse();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer({ organizationId: ctx.organizationId, db: db() });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
