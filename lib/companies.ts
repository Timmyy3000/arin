import { and, count, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { deals } from "@/db/schema/deals";
import { meetings } from "@/db/schema/meetings";
import { notes } from "@/db/schema/notes";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";

export type Company = typeof companies.$inferSelect;

export type CompanyCascadeChildren = {
  dealIds: string[];
  signalIds: string[];
  meetingIds: string[];
  noteIds: string[];
  taskIds: string[];
};

export type CompanyCascadeCounts = {
  deals: number;
  signals: number;
  meetings: number;
  notes: number;
  tasks: number;
};

export async function previewCompanyDelete(
  db: Database,
  organizationId: string,
  companyId: string,
): Promise<CompanyCascadeCounts | null> {
  const [exists] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
    .limit(1);
  if (!exists) return null;
  const [dealRows, signalRows, meetingRows, noteRows, taskRows] = await Promise.all([
    db.select({ n: count() }).from(deals).where(eq(deals.companyId, companyId)),
    db.select({ n: count() }).from(signals).where(eq(signals.companyId, companyId)),
    db.select({ n: count() }).from(meetings).where(eq(meetings.companyId, companyId)),
    db.select({ n: count() }).from(notes).where(eq(notes.companyId, companyId)),
    db.select({ n: count() }).from(tasks).where(eq(tasks.companyId, companyId)),
  ]);
  return {
    deals: dealRows[0]?.n ?? 0,
    signals: signalRows[0]?.n ?? 0,
    meetings: meetingRows[0]?.n ?? 0,
    notes: noteRows[0]?.n ?? 0,
    tasks: taskRows[0]?.n ?? 0,
  };
}

export async function deleteCompany(
  db: Database,
  organizationId: string,
  companyId: string,
): Promise<{ before: Company; children: CompanyCascadeChildren } | null> {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
      .limit(1);
    if (!before) return null;

    const [dealIds, signalIds, meetingIds, noteIds, taskIds] = await Promise.all([
      tx.select({ id: deals.id }).from(deals).where(eq(deals.companyId, companyId)),
      tx.select({ id: signals.id }).from(signals).where(eq(signals.companyId, companyId)),
      tx.select({ id: meetings.id }).from(meetings).where(eq(meetings.companyId, companyId)),
      tx.select({ id: notes.id }).from(notes).where(eq(notes.companyId, companyId)),
      tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.companyId, companyId)),
    ]);
    await tx.delete(companies).where(eq(companies.id, companyId));
    return {
      before,
      children: {
        dealIds: dealIds.map((r) => r.id),
        signalIds: signalIds.map((r) => r.id),
        meetingIds: meetingIds.map((r) => r.id),
        noteIds: noteIds.map((r) => r.id),
        taskIds: taskIds.map((r) => r.id),
      },
    };
  });
}
