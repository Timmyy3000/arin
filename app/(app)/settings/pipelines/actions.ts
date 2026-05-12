"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { diffChangedFields, recordAudit, userActor } from "@/lib/audit";
import { requireOrgSession } from "@/lib/session";
import { isStageColor, type StageColor } from "@/lib/stage-colors";
import {
  createStage,
  deleteStage,
  previewStageFlagToggle,
  reorderStage,
  StageOpError,
  updateStage,
  type ReorderDirection,
} from "@/lib/stages";

const NameSchema = z.string().trim().min(1).max(80);

function normalizeColor(value: FormDataEntryValue | null): StageColor | null | undefined {
  if (value === null) return undefined;
  const s = String(value);
  if (s === "") return null;
  if (!isStageColor(s)) return undefined;
  return s;
}

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
function err(code: StageOpError["code"], message: string): { ok: false; code: StageOpError["code"]; message: string } {
  return { ok: false, code, message };
}
function mapError(e: unknown): { ok: false; code: StageOpError["code"]; message: string } {
  if (e instanceof StageOpError) return err(e.code, e.message);
  throw e;
}

function revalidateAll(): void {
  revalidatePath("/settings/pipelines");
  revalidatePath("/deals");
  revalidatePath("/companies", "layout");
}

export async function addStageAction(formData: FormData) {
  const session = await requireOrgSession();
  const pipelineId = z.string().uuid().parse(formData.get("pipelineId"));
  const name = NameSchema.parse(formData.get("name"));
  const color = normalizeColor(formData.get("color"));
  const isWon = formData.get("isWon") === "true";
  const isLost = formData.get("isLost") === "true";

  try {
    const result = await createStage(db(), session.organizationId, {
      pipelineId,
      name,
      color: color ?? null,
      isWon,
      isLost,
    });
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor: userActor(session.user.id, session.user.name ?? null),
      entityType: "stage",
      entityId: result.after.id,
      action: "create",
      changes: { after: result.after },
    });
    revalidateAll();
    return ok(result.after);
  } catch (e) {
    return mapError(e);
  }
}

export async function updateStageAction(formData: FormData) {
  const session = await requireOrgSession();
  const id = z.string().uuid().parse(formData.get("id"));
  const nameRaw = formData.get("name");
  const colorRaw = formData.get("color");
  const isWonRaw = formData.get("isWon");
  const isLostRaw = formData.get("isLost");

  try {
    const result = await updateStage(db(), session.organizationId, {
      id,
      name: nameRaw === null ? undefined : NameSchema.parse(nameRaw),
      color: colorRaw === null ? undefined : normalizeColor(colorRaw),
      isWon: isWonRaw === null ? undefined : isWonRaw === "true",
      isLost: isLostRaw === null ? undefined : isLostRaw === "true",
    });
    if (!result) return err("not_found", "Stage not found");
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor: userActor(session.user.id, session.user.name ?? null),
      entityType: "stage",
      entityId: result.after.id,
      action: "update",
      changes: diffChangedFields(result.before, result.after),
    });
    revalidateAll();
    return ok(result.after);
  } catch (e) {
    return mapError(e);
  }
}

const DirectionSchema = z.enum(["up", "down"]);

export async function reorderStageAction(input: {
  stageId: string;
  direction: ReorderDirection;
}) {
  const session = await requireOrgSession();
  const stageId = z.string().uuid().parse(input.stageId);
  const direction = DirectionSchema.parse(input.direction);

  try {
    const result = await reorderStage(db(), session.organizationId, stageId, direction);
    if (!result) return err("not_found", "Stage not found");
    if (result.before.id === result.after.id && result.before.order === result.after.order) {
      // boundary no-op; nothing to audit, nothing to revalidate
      return ok(result.after);
    }
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor: userActor(session.user.id, session.user.name ?? null),
      entityType: "stage",
      entityId: result.after.id,
      action: "update",
      changes: { before: { order: result.before.order }, after: { order: result.after.order } },
    });
    revalidateAll();
    return ok(result.after);
  } catch (e) {
    return mapError(e);
  }
}

export async function deleteStageAction(input: {
  stageId: string;
  destinationStageId: string;
}) {
  const session = await requireOrgSession();
  const stageId = z.string().uuid().parse(input.stageId);
  const destinationStageId = z.string().uuid().parse(input.destinationStageId);

  try {
    const result = await deleteStage(db(), session.organizationId, stageId, destinationStageId);
    if (!result) return err("not_found", "Stage not found");

    const actor = userActor(session.user.id, session.user.name ?? null);
    for (const dealId of result.migratedDealIds) {
      await recordAudit(db(), {
        organizationId: session.organizationId,
        actor,
        entityType: "deal",
        entityId: dealId,
        action: "update",
        changes: { before: { stageId }, after: { stageId: destinationStageId } },
      });
    }
    await recordAudit(db(), {
      organizationId: session.organizationId,
      actor,
      entityType: "stage",
      entityId: stageId,
      action: "delete",
      changes: { before: result.before },
    });
    revalidateAll();
    return ok({ migratedDealCount: result.migratedDealIds.length });
  } catch (e) {
    return mapError(e);
  }
}

export async function previewStageFlagToggleAction(input: { stageId: string }) {
  const session = await requireOrgSession();
  const stageId = z.string().uuid().parse(input.stageId);
  const result = await previewStageFlagToggle(db(), session.organizationId, stageId);
  if (!result) return err("not_found", "Stage not found");
  return ok(result);
}

