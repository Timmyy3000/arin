import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { deals, pipelines, stages } from "@/db/schema/deals";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerDealTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "list_pipelines",
    {
      title: "List pipelines and their stages",
      description: "Returns each pipeline with its ordered stages and won/lost flags.",
      inputSchema: {},
    },
    async () => {
      const ps = await ctx.db
        .select()
        .from(pipelines)
        .where(eq(pipelines.organizationId, ctx.organizationId));
      const result = [];
      for (const p of ps) {
        const sgs = await ctx.db
          .select()
          .from(stages)
          .where(eq(stages.pipelineId, p.id))
          .orderBy(asc(stages.order));
        result.push({ ...p, stages: sgs });
      }
      return jsonResult({ pipelines: result });
    },
  );

  server.registerTool(
    "create_deal",
    {
      title: "Create a deal",
      description:
        "Create a deal on a company. If pipelineId/stageId are omitted, the workspace's default pipeline and its first stage are used.",
      inputSchema: {
        companyId: z.string().uuid(),
        name: z.string().min(1),
        value: z.number().nonnegative().optional(),
        pipelineId: z.string().uuid().optional(),
        stageId: z.string().uuid().optional(),
        expectedCloseDate: z.string().datetime().optional(),
        ownerUserId: z.string().optional(),
      },
    },
    async (args) => {
      let pipelineId = args.pipelineId;
      let stageId = args.stageId;
      if (!pipelineId || !stageId) {
        const defaults = await ctx.db
          .select()
          .from(pipelines)
          .where(
            and(
              eq(pipelines.organizationId, ctx.organizationId),
              eq(pipelines.isDefault, true),
            ),
          )
          .limit(1);
        const def = defaults[0];
        if (!def) return jsonResult({ error: "no_default_pipeline" });
        pipelineId = def.id;
        if (!stageId) {
          const firstStage = await ctx.db
            .select()
            .from(stages)
            .where(eq(stages.pipelineId, def.id))
            .orderBy(asc(stages.order))
            .limit(1);
          if (!firstStage[0]) return jsonResult({ error: "no_stages" });
          stageId = firstStage[0].id;
        }
      }
      const [row] = await ctx.db
        .insert(deals)
        .values({
          organizationId: ctx.organizationId,
          companyId: args.companyId,
          pipelineId,
          stageId,
          name: args.name,
          value: args.value?.toString(),
          expectedCloseDate: args.expectedCloseDate ? new Date(args.expectedCloseDate) : undefined,
          ownerUserId: args.ownerUserId,
        })
        .returning();
      return jsonResult({ deal: row });
    },
  );

  server.registerTool(
    "update_deal",
    {
      title: "Update deal",
      description: "Patch a deal's fields (name, value, expected close, owner).",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        value: z.number().nonnegative().optional(),
        expectedCloseDate: z.string().datetime().optional(),
        ownerUserId: z.string().optional(),
      },
    },
    async ({ id, value, expectedCloseDate, ...patch }) => {
      const [row] = await ctx.db
        .update(deals)
        .set({
          ...patch,
          value: value !== undefined ? value.toString() : undefined,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, id), eq(deals.organizationId, ctx.organizationId)))
        .returning();
      if (!row) return jsonResult({ error: "not_found" });
      return jsonResult({ deal: row });
    },
  );

  server.registerTool(
    "move_deal_stage",
    {
      title: "Move a deal to a new stage",
      description:
        "Update a deal's stage and bump stage_entered_at. Stage must belong to the deal's pipeline.",
      inputSchema: { id: z.string().uuid(), stageId: z.string().uuid() },
    },
    async ({ id, stageId }) => {
      const dealRow = await ctx.db
        .select({ pipelineId: deals.pipelineId })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.organizationId, ctx.organizationId)))
        .limit(1);
      if (!dealRow[0]) return jsonResult({ error: "not_found" });

      const stageRow = await ctx.db
        .select({ pipelineId: stages.pipelineId })
        .from(stages)
        .where(eq(stages.id, stageId))
        .limit(1);
      if (!stageRow[0] || stageRow[0].pipelineId !== dealRow[0].pipelineId) {
        return jsonResult({ error: "stage_pipeline_mismatch" });
      }

      const [row] = await ctx.db
        .update(deals)
        .set({ stageId, stageEnteredAt: new Date(), updatedAt: new Date() })
        .where(eq(deals.id, id))
        .returning();
      return jsonResult({ deal: row });
    },
  );
}
