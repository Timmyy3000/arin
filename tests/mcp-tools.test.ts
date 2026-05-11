import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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

function structured<T>(result: unknown): T {
  return (result as { structuredContent?: unknown }).structuredContent as T;
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

  test("search_companies finds by partial name and partial domain", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    await client.callTool({ name: "create_company", arguments: { name: "Acme Corp", domain: "acme.com" } });
    await client.callTool({ name: "create_company", arguments: { name: "Globex", domain: "globex.io" } });

    const byName = structured<{ companies: { name: string }[] }>(
      await client.callTool({ name: "search_companies", arguments: { query: "acm" } }),
    );
    expect(byName.companies.map((c) => c.name)).toEqual(["Acme Corp"]);

    const byDomain = structured<{ companies: { name: string }[] }>(
      await client.callTool({ name: "search_companies", arguments: { query: "globex.i" } }),
    );
    expect(byDomain.companies.map((c) => c.name)).toEqual(["Globex"]);

    const empty = structured<{ companies: unknown[] }>(
      await client.callTool({ name: "search_companies", arguments: { query: "nomatch" } }),
    );
    expect(empty.companies).toEqual([]);
  });

  test("search_people finds by partial name or email, optionally scoped to company", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company: c1 } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Stripe", domain: "stripe.com" } }),
    );
    const { company: c2 } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Linear", domain: "linear.app" } }),
    );
    await client.callTool({
      name: "create_person",
      arguments: { name: "Patrick Collison", email: "patrick@stripe.com", companyId: c1.id },
    });
    await client.callTool({
      name: "create_person",
      arguments: { name: "Karri Saarinen", email: "karri@linear.app", companyId: c2.id },
    });

    const byName = structured<{ people: { name: string }[] }>(
      await client.callTool({ name: "search_people", arguments: { query: "patrick" } }),
    );
    expect(byName.people.map((p) => p.name)).toEqual(["Patrick Collison"]);

    const byEmail = structured<{ people: { name: string }[] }>(
      await client.callTool({ name: "search_people", arguments: { query: "linear.app" } }),
    );
    expect(byEmail.people.map((p) => p.name)).toEqual(["Karri Saarinen"]);

    const scoped = structured<{ people: { name: string }[] }>(
      await client.callTool({
        name: "search_people",
        arguments: { query: "ar", companyId: c2.id },
      }),
    );
    expect(scoped.people.map((p) => p.name)).toEqual(["Karri Saarinen"]);
  });

  test("list_deals_for_company / get_deal / list_deals round-trip", async () => {
    const orgId = await seedOrgWithPipeline();
    const { client, close: c } = await makeClient(orgId);
    close = c;
    const { company } = structured<{ company: { id: string } }>(
      await client.callTool({ name: "create_company", arguments: { name: "Vercel", domain: "vercel.com" } }),
    );
    const { deal: d1 } = structured<{ deal: { id: string; stageId: string } }>(
      await client.callTool({
        name: "create_deal",
        arguments: { companyId: company.id, name: "Pro plan", value: 12000 },
      }),
    );
    const { deal: d2 } = structured<{ deal: { id: string } }>(
      await client.callTool({
        name: "create_deal",
        arguments: { companyId: company.id, name: "Enterprise plan", value: 90000 },
      }),
    );

    const onCompany = structured<{ deals: { id: string }[] }>(
      await client.callTool({ name: "list_deals_for_company", arguments: { companyId: company.id } }),
    );
    expect(onCompany.deals.map((d) => d.id).sort()).toEqual([d1.id, d2.id].sort());

    const single = structured<{ deal: { name: string } }>(
      await client.callTool({ name: "get_deal", arguments: { id: d1.id } }),
    );
    expect(single.deal.name).toBe("Pro plan");

    const all = structured<{ deals: { id: string }[] }>(
      await client.callTool({ name: "list_deals", arguments: {} }),
    );
    expect(all.deals.length).toBe(2);

    const inStage = structured<{ deals: { id: string }[] }>(
      await client.callTool({ name: "list_deals", arguments: { stageId: d1.stageId } }),
    );
    expect(inStage.deals.length).toBe(2);
  });

  test("cross-org access is rejected (org-scoped queries)", async () => {
    const orgA = await seedOrgWithPipeline("org_a");
    const orgB = await seedOrgWithPipeline("org_b");
    const a = await makeClient(orgA);
    const { company } = structured<{ company: { id: string } }>(
      await a.client.callTool({ name: "create_company", arguments: { name: "Acme", domain: "acme.com" } }),
    );
    await a.client.callTool({
      name: "create_person",
      arguments: { name: "Alice", email: "alice@acme.com", companyId: company.id },
    });
    const { deal } = structured<{ deal: { id: string } }>(
      await a.client.callTool({
        name: "create_deal",
        arguments: { companyId: company.id, name: "Acme expansion", value: 1000 },
      }),
    );
    await a.close();

    const b = await makeClient(orgB);
    close = b.close;

    expect(
      structured<{ error?: string }>(
        await b.client.callTool({ name: "get_company", arguments: { id: company.id } }),
      ).error,
    ).toBe("not_found");

    expect(
      structured<{ companies: unknown[] }>(
        await b.client.callTool({ name: "search_companies", arguments: { query: "acme" } }),
      ).companies,
    ).toEqual([]);

    expect(
      structured<{ people: unknown[] }>(
        await b.client.callTool({ name: "search_people", arguments: { query: "alice" } }),
      ).people,
    ).toEqual([]);

    expect(
      structured<{ error?: string }>(
        await b.client.callTool({ name: "get_deal", arguments: { id: deal.id } }),
      ).error,
    ).toBe("not_found");

    expect(
      structured<{ deals: unknown[] }>(
        await b.client.callTool({ name: "list_deals", arguments: {} }),
      ).deals,
    ).toEqual([]);

    expect(
      structured<{ deals: unknown[] }>(
        await b.client.callTool({
          name: "list_deals_for_company",
          arguments: { companyId: company.id },
        }),
      ).deals,
    ).toEqual([]);
  });
});
