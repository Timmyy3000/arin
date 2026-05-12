import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies, people } from "@/db/schema/companies";
import { deals, pipelines, stages } from "@/db/schema/deals";
import { meetings } from "@/db/schema/meetings";
import { notes } from "@/db/schema/notes";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { deleteCompany, previewCompanyDelete } from "@/lib/companies";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_companies") {
  await db.insert(organization).values({ id: orgId, name: "Cos", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });

  const pipelineId = crypto.randomUUID();
  await db.insert(pipelines).values({ id: pipelineId, organizationId: orgId, name: "Sales" });
  const stageId = crypto.randomUUID();
  await db.insert(stages).values({ id: stageId, pipelineId, name: "Lead", order: 0 });
  await db.insert(deals).values([
    { id: crypto.randomUUID(), organizationId: orgId, companyId, pipelineId, stageId, name: "D1" },
    { id: crypto.randomUUID(), organizationId: orgId, companyId, pipelineId, stageId, name: "D2" },
  ]);

  await db.insert(signals).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    companyId,
    type: "news",
    title: "Funding",
    occurredAt: new Date(),
  });

  await db.insert(meetings).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    companyId,
    title: "Kickoff",
    scheduledAt: new Date(),
  });

  await db.insert(notes).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    companyId,
    body: "First call notes",
  });

  await db.insert(tasks).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    companyId,
    title: "Send proposal",
  });

  const personId = crypto.randomUUID();
  await db.insert(people).values({
    id: personId,
    organizationId: orgId,
    companyId,
    name: "Alice",
  });

  return { orgId, companyId, personId };
}

describe("lib/companies", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("previewCompanyDelete counts cascading children correctly", async () => {
    const { orgId, companyId } = await seed();
    const preview = await previewCompanyDelete(db, orgId, companyId);
    expect(preview).toEqual({ deals: 2, signals: 1, meetings: 1, notes: 1, tasks: 1 });
  });

  test("previewCompanyDelete returns null for cross-org company", async () => {
    const { companyId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const preview = await previewCompanyDelete(db, "org_b", companyId);
    expect(preview).toBeNull();
  });

  test("deleteCompany cascades children and returns their IDs; people.company_id nullified", async () => {
    const { orgId, companyId, personId } = await seed();
    const result = await deleteCompany(db, orgId, companyId);
    expect(result).not.toBeNull();
    expect(result!.children.dealIds).toHaveLength(2);
    expect(result!.children.signalIds).toHaveLength(1);
    expect(result!.children.meetingIds).toHaveLength(1);
    expect(result!.children.noteIds).toHaveLength(1);
    expect(result!.children.taskIds).toHaveLength(1);

    expect(await db.select().from(companies).where(eq(companies.id, companyId))).toHaveLength(0);
    expect(await db.select().from(deals).where(eq(deals.companyId, companyId))).toHaveLength(0);
    expect(await db.select().from(signals).where(eq(signals.companyId, companyId))).toHaveLength(0);
    expect(await db.select().from(meetings).where(eq(meetings.companyId, companyId))).toHaveLength(0);
    expect(await db.select().from(notes).where(eq(notes.companyId, companyId))).toHaveLength(0);
    expect(await db.select().from(tasks).where(eq(tasks.companyId, companyId))).toHaveLength(0);

    const personRow = await db.select().from(people).where(eq(people.id, personId));
    expect(personRow).toHaveLength(1);
    expect(personRow[0]!.companyId).toBeNull();
  });

  test("deleteCompany returns null for cross-org company", async () => {
    const { companyId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteCompany(db, "org_b", companyId);
    expect(result).toBeNull();
    expect(await db.select().from(companies).where(eq(companies.id, companyId))).toHaveLength(1);
  });
});
