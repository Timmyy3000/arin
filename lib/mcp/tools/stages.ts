import { z } from "zod";
import { diffChangedFields, recordAudit } from "@/lib/audit";
import { STAGE_COLORS } from "@/lib/stage-colors";
import {
  createStage,
  deleteStage,
  reorderStage,
  StageOpError,
  updateStage,
} from "@/lib/stages";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const ColorEnum = z.enum(STAGE_COLORS);

function toolError(e: unknown): ReturnType<typeof jsonResult> | null {
  if (e instanceof StageOpError) return jsonResult({ error: e.code, message: e.message });
  return null;
}

export function registerStageTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "create_stage",
    {
      title: "Create a stage",
      description:
        "Add a new stage to the end of a pipeline. Reorder afterwards if a different position is wanted.",
      inputSchema: {
        pipelineId: z.string().uuid(),
        name: z.string().min(1).max(80),
        color: ColorEnum.optional(),
        isWon: z.boolean().optional(),
        isLost: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const result = await createStage(ctx.db, ctx.organizationId, {
          pipelineId: args.pipelineId,
          name: args.name,
          color: args.color ?? null,
          isWon: args.isWon,
          isLost: args.isLost,
        });
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "stage",
          entityId: result.after.id,
          action: "create",
          changes: { after: result.after },
        });
        return jsonResult({ stage: result.after });
      } catch (e) {
        const handled = toolError(e);
        if (handled) return handled;
        throw e;
      }
    },
  );

  server.registerTool(
    "update_stage",
    {
      title: "Update a stage",
      description:
        "Patch a stage's fields. Pass `color: null` to clear the stage's colour. Omit a field to leave it unchanged.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().min(1).max(80).optional(),
        color: ColorEnum.nullable().optional(),
        isWon: z.boolean().optional(),
        isLost: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const result = await updateStage(ctx.db, ctx.organizationId, {
          id: args.id,
          name: args.name,
          color: args.color,
          isWon: args.isWon,
          isLost: args.isLost,
        });
        if (!result) return jsonResult({ error: "not_found" });
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "stage",
          entityId: result.after.id,
          action: "update",
          changes: diffChangedFields(result.before, result.after),
        });
        return jsonResult({ stage: result.after });
      } catch (e) {
        const handled = toolError(e);
        if (handled) return handled;
        throw e;
      }
    },
  );

  server.registerTool(
    "reorder_stage",
    {
      title: "Move a stage up or down within its pipeline",
      description: "Swap a stage's position with the adjacent stage in the same pipeline.",
      inputSchema: {
        id: z.string().uuid(),
        direction: z.enum(["up", "down"]),
      },
    },
    async ({ id, direction }) => {
      try {
        const result = await reorderStage(ctx.db, ctx.organizationId, id, direction);
        if (!result) return jsonResult({ error: "not_found" });
        if (result.before.id === result.after.id && result.before.order === result.after.order) {
          return jsonResult({ stage: result.after, moved: false });
        }
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "stage",
          entityId: result.after.id,
          action: "update",
          changes: {
            before: { order: result.before.order },
            after: { order: result.after.order },
          },
        });
        return jsonResult({ stage: result.after, moved: true });
      } catch (e) {
        const handled = toolError(e);
        if (handled) return handled;
        throw e;
      }
    },
  );

  server.registerTool(
    "delete_stage",
    {
      title: "Delete a stage and migrate its deals",
      description:
        "Delete a stage. Any deals on the deleted stage are bulk-moved to `destinationStageId` (must be a different stage in the same pipeline). Refuses to delete the only stage in a pipeline.",
      inputSchema: {
        id: z.string().uuid(),
        destinationStageId: z.string().uuid(),
      },
    },
    async ({ id, destinationStageId }) => {
      try {
        const result = await deleteStage(ctx.db, ctx.organizationId, id, destinationStageId);
        if (!result) return jsonResult({ error: "not_found" });
        for (const dealId of result.migratedDealIds) {
          await recordAudit(ctx.db, {
            organizationId: ctx.organizationId,
            actor: ctx.actor,
            entityType: "deal",
            entityId: dealId,
            action: "update",
            changes: { before: { stageId: id }, after: { stageId: destinationStageId } },
          });
        }
        await recordAudit(ctx.db, {
          organizationId: ctx.organizationId,
          actor: ctx.actor,
          entityType: "stage",
          entityId: id,
          action: "delete",
          changes: { before: result.before },
        });
        return jsonResult({ migrated_deal_count: result.migratedDealIds.length });
      } catch (e) {
        const handled = toolError(e);
        if (handled) return handled;
        throw e;
      }
    },
  );
}
