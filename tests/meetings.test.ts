import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { meetings } from "@/db/schema/meetings";
import { deleteMeeting } from "@/lib/meetings";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_meetings") {
  await db.insert(organization).values({ id: orgId, name: "Meetings", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const meetingId = crypto.randomUUID();
  await db.insert(meetings).values({
    id: meetingId,
    organizationId: orgId,
    companyId,
    title: "Quarterly review",
    scheduledAt: new Date(),
  });
  return { orgId, meetingId };
}

describe("lib/meetings", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("deleteMeeting removes the row and returns the prior snapshot", async () => {
    const { orgId, meetingId } = await seed();
    const result = await deleteMeeting(db, orgId, meetingId);
    expect(result?.before.id).toBe(meetingId);
    const remaining = await db.select().from(meetings).where(eq(meetings.id, meetingId));
    expect(remaining).toHaveLength(0);
  });

  test("deleteMeeting returns null for cross-org meetings", async () => {
    const { meetingId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteMeeting(db, "org_b", meetingId);
    expect(result).toBeNull();
  });
});
