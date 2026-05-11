import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/db/schema/auth";
import { auditLog } from "@/db/schema/audit";
import { ENTITY_TYPES } from "@/lib/audit";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAuditTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "list_recent_activity",
    {
      title: "List recent activity in the workspace",
      description:
        "Audit-log-backed feed of changes across the workspace. Use this on a dispatched Claude run to see what's happened (by humans or other Claude sessions) since you last ran. Filter by actor or entity type to narrow.",
      inputSchema: {
        since: z.string().datetime().optional(),
        actorUserId: z.string().optional(),
        actorClientId: z.string().optional(),
        entityType: z.enum(ENTITY_TYPES).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ since, actorUserId, actorClientId, entityType, limit }) => {
      const conds = [eq(auditLog.organizationId, ctx.organizationId)];
      if (since) conds.push(gt(auditLog.createdAt, new Date(since)));
      if (actorUserId) conds.push(eq(auditLog.actorUserId, actorUserId));
      if (actorClientId) conds.push(eq(auditLog.actorClientId, actorClientId));
      if (entityType) conds.push(eq(auditLog.entityType, entityType));

      const rows = await ctx.db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          actorType: auditLog.actorType,
          actorUserId: auditLog.actorUserId,
          actorUserName: sql<
            string | null
          >`COALESCE(${user.name}, ${auditLog.actorUserName})`.as("actor_user_name"),
          actorTokenId: auditLog.actorTokenId,
          actorTokenName: auditLog.actorTokenName,
          actorClientId: auditLog.actorClientId,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          changes: auditLog.changes,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.actorUserId, user.id))
        .where(and(...conds))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit ?? 50);

      return jsonResult({ activity: rows });
    },
  );
}
