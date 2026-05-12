import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuditTools } from "./tools/audit";
import { registerCompanyTools } from "./tools/companies";
import { registerDealTools } from "./tools/deals";
import { registerMeetingTools } from "./tools/meetings";
import { registerNoteTools } from "./tools/notes";
import { registerPeopleTools } from "./tools/people";
import { registerResearchTools } from "./tools/research";
import { registerSignalTools } from "./tools/signals";
import { registerStageTools } from "./tools/stages";
import { registerTaskTools } from "./tools/tasks";
import type { McpContext } from "./context";

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: "arin", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  registerCompanyTools(server, ctx);
  registerPeopleTools(server, ctx);
  registerSignalTools(server, ctx);
  registerResearchTools(server, ctx);
  registerTaskTools(server, ctx);
  registerMeetingTools(server, ctx);
  registerDealTools(server, ctx);
  registerNoteTools(server, ctx);
  registerStageTools(server, ctx);
  registerAuditTools(server, ctx);

  return server;
}

export function jsonResult(value: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent: value,
  };
}
