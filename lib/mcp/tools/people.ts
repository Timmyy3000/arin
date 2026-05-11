import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { people } from "@/db/schema/companies";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const PERSONA = z.enum([
  "champion",
  "decision_maker",
  "technical_evaluator",
  "end_user",
  "unknown",
]);
const ENGAGEMENT = z.enum(["cold", "warm", "hot", "on_fire"]);

export function registerPeopleTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "list_people",
    {
      title: "List people",
      description: "List people in the workspace, optionally filtered by company.",
      inputSchema: {
        companyId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ companyId, limit }) => {
      const where = companyId
        ? and(eq(people.organizationId, ctx.organizationId), eq(people.companyId, companyId))
        : eq(people.organizationId, ctx.organizationId);
      const rows = await ctx.db
        .select()
        .from(people)
        .where(where)
        .orderBy(desc(people.lastInteractionAt))
        .limit(limit ?? 50);
      return jsonResult({ people: rows });
    },
  );

  server.registerTool(
    "get_person",
    {
      title: "Get person by id",
      description: "Fetch a single person by UUID.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const rows = await ctx.db
        .select()
        .from(people)
        .where(and(eq(people.id, id), eq(people.organizationId, ctx.organizationId)))
        .limit(1);
      if (!rows[0]) return jsonResult({ error: "not_found" });
      return jsonResult({ person: rows[0] });
    },
  );

  server.registerTool(
    "create_person",
    {
      title: "Create person",
      description: "Add a person, optionally linked to a company.",
      inputSchema: {
        name: z.string().min(1),
        companyId: z.string().uuid().optional(),
        email: z.string().email().optional(),
        title: z.string().optional(),
        linkedinUrl: z.string().url().optional(),
        persona: PERSONA.optional(),
        engagement: ENGAGEMENT.optional(),
      },
    },
    async (args) => {
      const [row] = await ctx.db
        .insert(people)
        .values({
          organizationId: ctx.organizationId,
          ...args,
          persona: args.persona ?? "unknown",
        })
        .returning();
      return jsonResult({ person: row });
    },
  );

  server.registerTool(
    "update_person",
    {
      title: "Update person",
      description: "Patch a person's fields.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        title: z.string().optional(),
        linkedinUrl: z.string().url().optional(),
        persona: PERSONA.optional(),
        engagement: ENGAGEMENT.optional(),
        lastInteractionAt: z.string().datetime().optional(),
      },
    },
    async ({ id, lastInteractionAt, ...patch }) => {
      const [row] = await ctx.db
        .update(people)
        .set({
          ...patch,
          lastInteractionAt: lastInteractionAt ? new Date(lastInteractionAt) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(people.id, id), eq(people.organizationId, ctx.organizationId)))
        .returning();
      if (!row) return jsonResult({ error: "not_found" });
      return jsonResult({ person: row });
    },
  );

  server.registerTool(
    "search_people",
    {
      title: "Search people by name or email",
      description:
        "Case-insensitive partial match across name and email. Use this to find a contact when you only know their first name or part of their email.",
      inputSchema: {
        query: z.string().min(1),
        companyId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, companyId, limit }) => {
      const pattern = `%${query}%`;
      const fuzzy = or(ilike(people.name, pattern), ilike(people.email, pattern));
      const where = companyId
        ? and(eq(people.organizationId, ctx.organizationId), eq(people.companyId, companyId), fuzzy)
        : and(eq(people.organizationId, ctx.organizationId), fuzzy);
      const rows = await ctx.db
        .select()
        .from(people)
        .where(where)
        .orderBy(desc(people.lastInteractionAt))
        .limit(limit ?? 20);
      return jsonResult({ people: rows });
    },
  );
}
