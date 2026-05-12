"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { recordAudit, userActor, type EntityType } from "@/lib/audit";
import {
  deleteCompany,
  previewCompanyDelete,
  type CompanyCascadeCounts,
} from "@/lib/companies";
import { requireOrgSession } from "@/lib/session";

export async function previewCompanyDeleteAction(input: {
  companyId: string;
}): Promise<{ ok: true; data: CompanyCascadeCounts } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const companyId = z.string().uuid().parse(input.companyId);
  const data = await previewCompanyDelete(db(), session.organizationId, companyId);
  if (!data) return { ok: false, message: "Company not found" };
  return { ok: true, data };
}

export async function deleteCompanyAction(input: {
  companyId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireOrgSession();
  const companyId = z.string().uuid().parse(input.companyId);

  const result = await deleteCompany(db(), session.organizationId, companyId);
  if (!result) return { ok: false, message: "Company not found" };

  const actor = userActor(session.user.id, session.user.name ?? null);
  const beforeStub = { companyId };
  const fanouts: Array<{ entityType: EntityType; ids: string[] }> = [
    { entityType: "deal", ids: result.children.dealIds },
    { entityType: "signal", ids: result.children.signalIds },
    { entityType: "meeting", ids: result.children.meetingIds },
    { entityType: "note", ids: result.children.noteIds },
    { entityType: "task", ids: result.children.taskIds },
  ];
  for (const { entityType, ids } of fanouts) {
    for (const id of ids) {
      await recordAudit(db(), {
        organizationId: session.organizationId,
        actor,
        entityType,
        entityId: id,
        action: "delete",
        changes: { before: beforeStub },
      });
    }
  }
  await recordAudit(db(), {
    organizationId: session.organizationId,
    actor,
    entityType: "company",
    entityId: companyId,
    action: "delete",
    changes: { before: result.before },
  });

  revalidatePath("/companies");
  revalidatePath("/deals");
  revalidatePath("/meetings");
  revalidatePath("/tasks");
  revalidatePath("/people");
  revalidatePath("/");
  return { ok: true };
}
