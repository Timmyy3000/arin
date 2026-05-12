import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { notes } from "@/db/schema/notes";
import { deleteNote } from "@/lib/notes";
import { resetDb } from "./setup";

const db = createDb(process.env.TEST_DATABASE_URL!);

async function seed(orgId = "org_notes") {
  await db.insert(organization).values({ id: orgId, name: "Notes", slug: orgId });
  const companyId = crypto.randomUUID();
  await db.insert(companies).values({ id: companyId, organizationId: orgId, name: "Acme" });
  const noteId = crypto.randomUUID();
  await db.insert(notes).values({
    id: noteId,
    organizationId: orgId,
    companyId,
    body: "First contact email sent",
  });
  return { orgId, noteId };
}

describe("lib/notes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("deleteNote removes the row and returns the prior snapshot", async () => {
    const { orgId, noteId } = await seed();
    const result = await deleteNote(db, orgId, noteId);
    expect(result?.before.id).toBe(noteId);
    const remaining = await db.select().from(notes).where(eq(notes.id, noteId));
    expect(remaining).toHaveLength(0);
  });

  test("deleteNote returns null for cross-org notes", async () => {
    const { noteId } = await seed("org_a");
    await db.insert(organization).values({ id: "org_b", name: "B", slug: "org_b" });
    const result = await deleteNote(db, "org_b", noteId);
    expect(result).toBeNull();
  });
});
