import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { pipelines, stages } from "@/db/schema/deals";
import { createMcpServer } from "@/lib/mcp/server";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seedOrgWithPipeline(orgId = "org_mcp"): Promise<string> {
  await db.insert(organization).values({ id: orgId, name: "MCP", slug: orgId });
  const pipelineId = crypto.randomUUID();
  await db.insert(pipelines).values({ id: pipelineId, organizationId: orgId, name: "Sales", isDefault: true });
  await db.insert(stages).values([
    { id: crypto.randomUUID(), pipelineId, name: "Lead", order: 0 },
    { id: crypto.randomUUID(), pipelineId, name: "Won", order: 1, isWon: true },
  ]);
  return orgId;
}

async function makeClient(orgId: string) {
  const [client, server] = InMemoryTransport.createLinkedPair();
  const mcp = createMcpServer({ organizationId: orgId, db });
  await mcp.connect(server);
  const c = new Client({ name: "test", version: "0.0.0" });
  await c.connect(client);
  return { client: c, close: () => mcp.close() };
}

function structured<T>(result: { structuredContent?: unknown }): T {
  return result.structuredContent as T;
}

describe("MCP tools", () => {
  let close: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    if (close) await close();
  });

  test("tools/list returns the registered tool set", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const list = await client.listTools();
    const names = list.tools.map((t) => t.name).sort();
    expect(names).toContain("create_company");
    expect(names).toContain("get_company_by_domain");
    expect(names).toContain("set_company_temperature");
    expect(names).toContain("add_signal");
    expect(names).toContain("upsert_research_section");
    expect(names).toContain("create_task");
    expect(names).toContain("create_meeting");
    expect(names).toContain("create_deal");
    expect(names).toContain("move_deal_stage");
    expect(names).toContain("add_note");
  });

  test("create_company → get_company_by_domain round-trip", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const created = structured<{ company: { id: string; name: string } }>(
      await client.callTool({
        name: "create_company",
        arguments: { name: "Stripe", domain: "stripe.com", industry: "Fintech" },
      }),
    );
    expect(created.company.name).toBe("Stripe");

    const fetched = structured<{ company: { id: string } | null }>(
      await client.callTool({
        name: "get_company_by_domain",
        arguments: { domain: "stripe.com" },
      }),
    );
    expect(fetched.company?.id).toBe(created.company.id);
  });

  test("add_signal updates companies.last_signal_at", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company } = structured<{ company: { id: string } }>(
      await client.callTool({
        name: "create_company",
        arguments: { name: "Linear", domain: "linear.app" },
      }),
    );
    await client.callTool({
      name: "add_signal",
      arguments: {
        companyId: company.id,
        type: "page_visit",
        title: "Visited pricing",
        occurredAt: "2026-04-30T12:00:00Z",
      },
    });
    const fresh = structured<{ company: { lastSignalAt: string } }>(
      await client.callTool({ name: "get_company", arguments: { id: company.id } }),
    );
    expect(fresh.company.lastSignalAt).toBeDefined();
  });

  test("upsert_research_section is idempotent on (company, section)", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Vercel", domain: "vercel.com" } }),
    );
    await client.callTool({
      name: "upsert_research_section",
      arguments: { companyId: company.id, section: "icp_fit", body: "first" },
    });
    await client.callTool({
      name: "upsert_research_section",
      arguments: { companyId: company.id, section: "icp_fit", body: "second" },
    });
    const got = structured<{ research: { section: string; body: string }[] }>(
      await client.callTool({ name: "get_research_for_company", arguments: { companyId: company.id } }),
    );
    expect(got.research).toHaveLength(1);
    expect(got.research[0]?.body).toBe("second");
  });

  test("create_task → list_open_tasks → update_task to done", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Plaid", domain: "plaid.com" } }),
    );
    const created = structured<{ task: { id: string } }>(
      await client.callTool({
        name: "create_task",
        arguments: {
          companyId: company.id,
          title: "Email Patrick re: pricing",
          reasoning: "Buyer asked for pricing on the call.",
          priority: "high",
          type: "email",
        },
      }),
    );
    const open = structured<{ tasks: { id: string }[] }>(
      await client.callTool({ name: "list_open_tasks", arguments: {} }),
    );
    expect(open.tasks.find((t) => t.id === created.task.id)).toBeDefined();

    const updated = structured<{ task: { status: string; completedAt: string | null } }>(
      await client.callTool({
        name: "update_task",
        arguments: { id: created.task.id, status: "done" },
      }),
    );
    expect(updated.task.status).toBe("done");
    expect(updated.task.completedAt).not.toBeNull();
  });

  test("create_deal → move_deal_stage", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Notion", domain: "notion.so" } }),
    );
    const pipelinesResult = structured<{ pipelines: { stages: { id: string; name: string }[] }[] }>(
      await client.callTool({ name: "list_pipelines", arguments: {} }),
    );
    const wonStageId = pipelinesResult.pipelines[0]?.stages.find((s) => s.name === "Won")?.id;
    expect(wonStageId).toBeDefined();

    const created = structured<{ deal: { id: string; stageId: string } }>(
      await client.callTool({
        name: "create_deal",
        arguments: { companyId: company.id, name: "Annual contract", value: 50000 },
      }),
    );
    expect(created.deal).toBeDefined();

    const moved = structured<{ deal: { stageId: string } }>(
      await client.callTool({
        name: "move_deal_stage",
        arguments: { id: created.deal.id, stageId: wonStageId! },
      }),
    );
    expect(moved.deal.stageId).toBe(wonStageId!);
  });

  test("cross-org access is rejected (org-scoped queries)", async () => {
    const orgA = await seedOrgWithPipeline("org_a");
    const orgB = await seedOrgWithPipeline("org_b");
    const a = await makeClient(orgA);
    const { company } = structured<{ company: { id: string } }>(
      await a.client.callTool({ name: "create_company", arguments: { name: "Acme", domain: "acme.com" } }),
    );
    await a.close();

    const b = await makeClient(orgB);
    const fromB = structured<{ error?: string; company?: unknown }>(
      await b.client.callTool({ name: "get_company", arguments: { id: company.id } }),
    );
    close = b.close;
    expect(fromB.error).toBe("not_found");
    expect(fromB.company).toBeUndefined();
  });
});
