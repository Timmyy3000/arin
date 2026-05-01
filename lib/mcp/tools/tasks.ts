import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "@/db/schema/tasks";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const PRIORITY = z.enum(["urgent", "high", "medium", "low"]);
const TYPE = z.enum(["call", "email", "linkedin", "research", "other"]);
const STATUS = z.enum(["open", "done", "dismissed"]);

export function registerTaskTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "create_task",
    {
      title: "Create a task",
      description:
        "Create a task with reasoning. Always include a clear `reasoning` line explaining WHY the human should do this — that's the value.",
      inputSchema: {
        title: z.string().min(1),
        reasoning: z.string().optional(),
        priority: PRIORITY.optional(),
        type: TYPE.optional(),
        companyId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        dueDate: z.string().datetime().optional(),
        assigneeUserId: z.string().optional(),
      },
    },
    async (args) => {
      const [row] = await ctx.db
        .insert(tasks)
        .values({
          organizationId: ctx.organizationId,
          title: args.title,
          reasoning: args.reasoning,
          priority: args.priority ?? "medium",
          type: args.type ?? "other",
          companyId: args.companyId,
          personId: args.personId,
          dealId: args.dealId,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          assigneeUserId: args.assigneeUserId,
        })
        .returning();
      return jsonResult({ task: row });
    },
  );

  server.registerTool(
    "update_task",
    {
      title: "Update a task",
      description:
        "Patch a task. Set status to `done` or `dismissed` to close it (records completedAt).",
      inputSchema: {
        id: z.string().uuid(),
        title: z.string().optional(),
        reasoning: z.string().optional(),
        priority: PRIORITY.optional(),
        type: TYPE.optional(),
        status: STATUS.optional(),
        dueDate: z.string().datetime().optional(),
      },
    },
    async ({ id, dueDate, status, ...patch }) => {
      const set: Record<string, unknown> = { ...patch, updatedAt: new Date() };
      if (dueDate) set.dueDate = new Date(dueDate);
      if (status) {
        set.status = status;
        set.completedAt = status === "open" ? null : new Date();
      }
      const [row] = await ctx.db
        .update(tasks)
        .set(set)
        .where(and(eq(tasks.id, id), eq(tasks.organizationId, ctx.organizationId)))
        .returning();
      if (!row) return jsonResult({ error: "not_found" });
      return jsonResult({ task: row });
    },
  );

  server.registerTool(
    "list_open_tasks",
    {
      title: "List open tasks",
      description:
        "List open tasks in the workspace, ordered by priority then due date. Optionally scope to a company.",
      inputSchema: {
        companyId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ companyId, limit }) => {
      const where = companyId
        ? and(
            eq(tasks.organizationId, ctx.organizationId),
            eq(tasks.status, "open"),
            eq(tasks.companyId, companyId),
          )
        : and(eq(tasks.organizationId, ctx.organizationId), eq(tasks.status, "open"));
      const rows = await ctx.db
        .select()
        .from(tasks)
        .where(where)
        .orderBy(desc(tasks.priority), asc(tasks.dueDate))
        .limit(limit ?? 50);
      return jsonResult({ tasks: rows });
    },
  );
}
