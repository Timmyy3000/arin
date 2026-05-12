import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies, people } from "@/db/schema/companies";
import { meetingAttendees, meetings } from "@/db/schema/meetings";
import { notes } from "@/db/schema/notes";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { deletePerson, previewPersonDelete } from "@/lib/people";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_people") {
  await db.insert(organization).values({ id: orgId, name: "People", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const personId = crypto.randomUUID();
  await db.insert(people).values({
    id: personId,
    organizationId: orgId,
    companyId,
    name: "Alice Engineer",
  });
  await db.insert(tasks).values([
    { id: crypto.randomUUID(), organizationId: orgId, personId, title: "Send recap" },
    { id: crypto.randomUUID(), organizationId: orgId, personId, title: "Schedule call" },
  ]);
  await db.insert(notes).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    personId,
    body: "Loves Postgres",
  });
  const meetingId = crypto.randomUUID();
  await db.insert(meetings).values({
    id: meetingId,
    organizationId: orgId,
    companyId,
    title: "Kickoff",
    scheduledAt: new Date(),
  });
  await db.insert(meetingAttendees).values({ meetingId, personId });
  const signalId = crypto.randomUUID();
  await db.insert(signals).values({
    id: signalId,
    organizationId: orgId,
    companyId,
    personId,
    type: "email",
    title: "Replied to outreach",
    occurredAt: new Date(),
  });
  return { orgId, personId, signalId };
}

describe("lib/people", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("previewPersonDelete counts cascading children correctly", async () => {
    const { orgId, personId } = await seed();
    const preview = await previewPersonDelete(db, orgId, personId);
    expect(preview).toEqual({ tasks: 2, notes: 1, meetingAttendances: 1 });
  });

  test("previewPersonDelete returns null for cross-org person", async () => {
    const { personId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const preview = await previewPersonDelete(db, "org_b", personId);
    expect(preview).toBeNull();
  });

  test("deletePerson cascades tasks/notes/attendances and returns child IDs", async () => {
    const { orgId, personId, signalId } = await seed();
    const result = await deletePerson(db, orgId, personId);
    expect(result).not.toBeNull();
    expect(result!.children.taskIds).toHaveLength(2);
    expect(result!.children.noteIds).toHaveLength(1);

    expect(await db.select().from(people).where(eq(people.id, personId))).toHaveLength(0);
    expect(await db.select().from(tasks).where(eq(tasks.personId, personId))).toHaveLength(0);
    expect(await db.select().from(notes).where(eq(notes.personId, personId))).toHaveLength(0);

    const signalRow = await db.select().from(signals).where(eq(signals.id, signalId));
    expect(signalRow).toHaveLength(1);
    expect(signalRow[0]!.personId).toBeNull();
  });

  test("deletePerson returns null for cross-org person", async () => {
    const { personId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deletePerson(db, "org_b", personId);
    expect(result).toBeNull();
    expect(await db.select().from(people).where(eq(people.id, personId))).toHaveLength(1);
  });
});
