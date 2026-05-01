import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { companies } from "@/db/schema/companies";
import type { McpContext } from "../context";
import { jsonResult } from "../server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TEMPERATURE = z.enum(["cold", "warm", "hot", "on_fire"]);

export function registerCompanyTools(server: McpServer, ctx: McpContext): void {
  server.registerTool(
    "list_companies",
    {
      title: "List companies",
      description:
        "List all companies in the workspace, newest signal first. Use this to scan accounts, not to look up a specific one — for that use get_company_by_domain.",
      inputSchema: {
        temperature: TEMPERATURE.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args) => {
      const limit = args.limit ?? 50;
      const where = args.temperature
        ? and(
            eq(companies.organizationId, ctx.organizationId),
            eq(companies.temperature, args.temperature),
          )
        : eq(companies.organizationId, ctx.organizationId);
      const rows = await ctx.db
        .select()
        .from(companies)
        .where(where)
        .orderBy(desc(companies.lastSignalAt))
        .limit(limit);
      return jsonResult({ companies: rows });
    },
  );

  server.registerTool(
    "get_company",
    {
      title: "Get company by id",
      description: "Fetch a single company by its UUID.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const rows = await ctx.db
        .select()
        .from(companies)
        .where(and(eq(companies.id, id), eq(companies.organizationId, ctx.organizationId)))
        .limit(1);
      if (!rows[0]) return jsonResult({ error: "not_found" });
      return jsonResult({ company: rows[0] });
    },
  );

  server.registerTool(
    "get_company_by_domain",
    {
      title: "Get company by domain",
      description:
        "Fetch a company by its domain. Always call this before create_company to avoid duplicates.",
      inputSchema: { domain: z.string() },
    },
    async ({ domain }) => {
      const rows = await ctx.db
        .select()
        .from(companies)
        .where(and(eq(companies.domain, domain), eq(companies.organizationId, ctx.organizationId)))
        .limit(1);
      return jsonResult({ company: rows[0] ?? null });
    },
  );

  server.registerTool(
    "create_company",
    {
      title: "Create company",
      description:
        "Insert a new company. Call get_company_by_domain first to avoid duplicates (domain is unique per workspace).",
      inputSchema: {
        name: z.string().min(1),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employeeCount: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
        temperature: TEMPERATURE.optional(),
      },
    },
    async (args) => {
      const [row] = await ctx.db
        .insert(companies)
        .values({ organizationId: ctx.organizationId, ...args })
        .returning();
      return jsonResult({ company: row });
    },
  );

  server.registerTool(
    "update_company",
    {
      title: "Update company",
      description: "Patch a company's fields. Only provided fields are changed.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employeeCount: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
      },
    },
    async ({ id, ...patch }) => {
      const [row] = await ctx.db
        .update(companies)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(companies.id, id), eq(companies.organizationId, ctx.organizationId)))
        .returning();
      if (!row) return jsonResult({ error: "not_found" });
      return jsonResult({ company: row });
    },
  );

  server.registerTool(
    "set_company_temperature",
    {
      title: "Set company temperature",
      description:
        "Update a company's temperature (cold | warm | hot | on_fire). Bumps temperature_updated_at.",
      inputSchema: { id: z.string().uuid(), temperature: TEMPERATURE },
    },
    async ({ id, temperature }) => {
      const [row] = await ctx.db
        .update(companies)
        .set({ temperature, temperatureUpdatedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(companies.id, id), eq(companies.organizationId, ctx.organizationId)))
        .returning();
      if (!row) return jsonResult({ error: "not_found" });
      return jsonResult({ company: row });
    },
  );
}
