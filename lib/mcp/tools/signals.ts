import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { companies } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSignalTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "add_signal",
    {
      title: "Add a signal to a company",
      description:
        "Append-only event log entry (e.g., page_visit, funding_round, hiring, news). Bumps companies.last_signal_at.",
      inputSchema: {
        companyId: z.string().uuid(),
        personId: z.string().uuid().optional(),
        type: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        occurredAt: z.string().datetime().optional(),
      },
    },
    async (args) => {
      const occurredAt = args.occurredAt ? new Date(args.occurredAt) : new Date();
      const [row] = await ctx.db
        .insert(signals)
        .values({
          organizationId: ctx.organizationId,
          companyId: args.companyId,
          personId: args.personId,
          type: args.type,
          title: args.title,
          description: args.description,
          sourceUrl: args.sourceUrl,
          occurredAt,
        })
        .returning();
      await ctx.db
        .update(companies)
        .set({ lastSignalAt: occurredAt })
        .where(
          and(eq(companies.id, args.companyId), eq(companies.organizationId, ctx.organizationId)),
        );
      return jsonResult({ signal: row });
    },
  );

  server.registerTool(
    "list_signals_for_company",
    {
      title: "List signals for a company",
      description: "Reverse-chronological list of signals attached to a company.",
      inputSchema: {
        companyId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ companyId, limit }) => {
      const rows = await ctx.db
        .select()
        .from(signals)
        .where(
          and(eq(signals.companyId, companyId), eq(signals.organizationId, ctx.organizationId)),
        )
        .orderBy(desc(signals.occurredAt))
        .limit(limit ?? 50);
      return jsonResult({ signals: rows });
    },
  );
}
