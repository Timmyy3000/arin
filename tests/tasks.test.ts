import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { tasks } from "@/db/schema/tasks";
import { deleteTask } from "@/lib/tasks";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_tasks") {
  await db.insert(organization).values({ id: orgId, name: "Tasks", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const taskId = crypto.randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    organizationId: orgId,
    companyId,
    title: "Follow up with Acme",
  });
  return { orgId, taskId };
}

describe("lib/tasks", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("deleteTask removes the row and returns the prior snapshot", async () => {
    const { orgId, taskId } = await seed();
    const result = await deleteTask(db, orgId, taskId);
    expect(result?.before.id).toBe(taskId);
    const remaining = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(remaining).toHaveLength(0);
  });

  test("deleteTask returns null for cross-org tasks", async () => {
    const { taskId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteTask(db, "org_b", taskId);
    expect(result).toBeNull();
  });
});
