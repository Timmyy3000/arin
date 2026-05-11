import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { diffChangedFields, recordAudit } from "@/lib/audit";
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
    "list_deals",
    {
      title: "List deals",
      description:
        "List deals in the workspace. Filter by stage or owner if provided. Most recently updated first.",
      inputSchema: {
        stageId: z.string().uuid().optional(),
        ownerUserId: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ stageId, ownerUserId, limit }) => {
      const conds = [eq(deals.organizationId, ctx.organizationId)];
      if (stageId) conds.push(eq(deals.stageId, stageId));
      if (ownerUserId) conds.push(eq(deals.ownerUserId, ownerUserId));
      const rows = await ctx.db
        .select()
        .from(deals)
        .where(and(...conds))
        .orderBy(desc(deals.updatedAt))
        .limit(limit ?? 50);
      return jsonResult({ deals: rows });
    },
  );

  server.registerTool(
    "get_deal",
    {
      title: "Get deal by id",
      description: "Fetch a single deal by UUID.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const rows = await ctx.db
        .select()
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.organizationId, ctx.organizationId)))
        .limit(1);
      if (!rows[0]) return jsonResult({ error: "not_found" });
      return jsonResult({ deal: rows[0] });
    },
  );

  server.registerTool(
    "list_deals_for_company",
    {
      title: "List deals on a company",
      description:
        "All deals attached to a specific company. Most recently updated first. Use this before create_deal to avoid creating duplicates.",
      inputSchema: {
        companyId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ companyId, limit }) => {
      const rows = await ctx.db
        .select()
        .from(deals)
        .where(
          and(eq(deals.organizationId, ctx.organizationId), eq(deals.companyId, companyId)),
        )
        .orderBy(desc(deals.updatedAt))
        .limit(limit ?? 50);
      return jsonResult({ deals: rows });
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
      await recordAudit(ctx.db, {
        organizationId: ctx.organizationId,
        actor: ctx.actor,
        entityType: "deal",
        entityId: row.id,
        action: "create",
        changes: { after: row },
      });
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
      const before = await ctx.db
        .select()
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.organizationId, ctx.organizationId)))
        .limit(1);
      if (!before[0]) return jsonResult({ error: "not_found" });
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
      await recordAudit(ctx.db, {
        organizationId: ctx.organizationId,
        actor: ctx.actor,
        entityType: "deal",
        entityId: row.id,
        action: "update",
        changes: diffChangedFields(before[0], row),
      });
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
      const before = await ctx.db
        .select()
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.organizationId, ctx.organizationId)))
        .limit(1);
      if (!before[0]) return jsonResult({ error: "not_found" });

      const stageRow = await ctx.db
        .select({ pipelineId: stages.pipelineId })
        .from(stages)
        .where(eq(stages.id, stageId))
        .limit(1);
      if (!stageRow[0] || stageRow[0].pipelineId !== before[0].pipelineId) {
        return jsonResult({ error: "stage_pipeline_mismatch" });
      }

      const [row] = await ctx.db
        .update(deals)
        .set({ stageId, stageEnteredAt: new Date(), updatedAt: new Date() })
        .where(eq(deals.id, id))
        .returning();
      await recordAudit(ctx.db, {
        organizationId: ctx.organizationId,
        actor: ctx.actor,
        entityType: "deal",
        entityId: row.id,
        action: "update",
        changes: diffChangedFields(before[0], row),
      });
      return jsonResult({ deal: row });
    },
  );
}
