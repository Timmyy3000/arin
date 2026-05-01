import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { notes } from "@/db/schema/notes";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerNoteTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "add_note",
    {
      title: "Add a note",
      description:
        "Free-form note attached to a company, person, or deal. Author defaults to `agent`.",
      inputSchema: {
        body: z.string().min(1),
        companyId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        author: z.enum(["agent", "user"]).optional(),
      },
    },
    async (args) => {
      const [row] = await ctx.db
        .insert(notes)
        .values({
          organizationId: ctx.organizationId,
          body: args.body,
          companyId: args.companyId,
          personId: args.personId,
          dealId: args.dealId,
          author: args.author ?? "agent",
        })
        .returning();
      return jsonResult({ note: row });
    },
  );

  server.registerTool(
    "list_notes",
    {
      title: "List notes",
      description: "List notes scoped to a company, person, or deal (one of the three required).",
      inputSchema: {
        companyId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ companyId, personId, dealId, limit }) => {
      if (!companyId && !personId && !dealId) {
        return jsonResult({ error: "must provide companyId, personId, or dealId" });
      }
      const conds = [eq(notes.organizationId, ctx.organizationId)];
      if (companyId) conds.push(eq(notes.companyId, companyId));
      if (personId) conds.push(eq(notes.personId, personId));
      if (dealId) conds.push(eq(notes.dealId, dealId));
      const rows = await ctx.db
        .select()
        .from(notes)
        .where(and(...conds))
        .orderBy(desc(notes.createdAt))
        .limit(limit ?? 50);
      return jsonResult({ notes: rows });
    },
  );
}
