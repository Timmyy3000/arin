import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { research } from "@/db/schema/signals";
import { diffChangedFields, recordAudit } from "@/lib/audit";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SUGGESTED_SECTIONS = [
  "overview",
  "why_we_win",
  "icp_fit",
  "competitive_positioning",
  "tech_stack",
  "recent_news",
  "case_studies",
  "org_changes",
  "industry_context",
];

export function registerResearchTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "upsert_research_section",
    {
      title: "Upsert a research section for a company",
      description: `Insert or replace one research section. Suggested keys: ${SUGGESTED_SECTIONS.join(
        ", ",
      )}. Free-string sections also allowed.`,
      inputSchema: {
        companyId: z.string().uuid(),
        section: z.string().min(1),
        body: z.string().min(1),
        sourceUrl: z.string().url().optional(),
      },
    },
    async (args) => {
      const existing = await ctx.db
        .select()
        .from(research)
        .where(
          and(
            eq(research.companyId, args.companyId),
            eq(research.section, args.section),
            eq(research.organizationId, ctx.organizationId),
          ),
        )
        .limit(1);
      const [row] = await ctx.db
        .insert(research)
        .values({
          organizationId: ctx.organizationId,
          companyId: args.companyId,
          section: args.section,
          body: args.body,
          sourceUrl: args.sourceUrl,
        })
        .onConflictDoUpdate({
          target: [research.companyId, research.section],
          set: {
            body: sql`excluded.body`,
            sourceUrl: sql`excluded.source_url`,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (existing[0]) {
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "research",
          entityId: row.id,
          action: "update",
          changes: diffChangedFields(existing[0], row),
        });
      } else {
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "research",
          entityId: row.id,
          action: "create",
          changes: { after: row },
        });
      }
      return jsonResult({ research: row });
    },
  );

  server.registerTool(
    "get_research_for_company",
    {
      title: "Get all research sections for a company",
      description: "Returns every research section attached to the company.",
      inputSchema: { companyId: z.string().uuid() },
    },
    async ({ companyId }) => {
      const rows = await ctx.db
        .select()
        .from(research)
        .where(
          and(eq(research.companyId, companyId), eq(research.organizationId, ctx.organizationId)),
        );
      return jsonResult({ research: rows });
    },
  );
}
