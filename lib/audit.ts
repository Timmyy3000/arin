import { z } from "zod";
import type { Database } from "@/db/client";
import { auditLog } from "@/db/schema/audit";

export const ENTITY_TYPES = [
  "company",
  "person",
  "task",
  "meeting",
  "deal",
  "note",
  "signal",
  "research",
  "service_token",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const ACTOR_TYPES = ["user", "service_token", "oauth_jwt"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

const REDACTIONS: Partial<Record<EntityType, readonly string[]>> = {
  service_token: ["tokenHash"],
};

function redact(
  entityType: EntityType,
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!payload) return payload;
  const drop = REDACTIONS[entityType];
  if (!drop?.length) return payload;
  const out: Record<string, unknown> = { ...payload };
  for (const f of drop) delete out[f];
  return out;
}

export type Actor =
  | {
      type: "user";
      userId: string;
      userName: string | null;
      tokenId: null;
      tokenName: null;
      clientId: null;
    }
  | {
      type: "service_token";
      userId: string | null;
      userName: string | null;
      tokenId: string;
      tokenName: string | null;
      clientId: null;
    }
  | {
      type: "oauth_jwt";
      userId: string;
      userName: string | null;
      tokenId: null;
      tokenName: null;
      clientId: string;
    };

export type AuditChanges =
  | { after: Record<string, unknown> }
  | { before: Record<string, unknown>; after: Record<string, unknown> }
  | { before: Record<string, unknown> };

export type AuditInput = {
  organizationId: string;
  actor: Actor;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  changes?: AuditChanges;
};

const inputSchema = z.object({
  organizationId: z.string().min(1),
  actor: z.object({
    type: z.enum(ACTOR_TYPES),
    userId: z.string().nullable(),
    userName: z.string().nullable(),
    tokenId: z.string().nullable(),
    tokenName: z.string().nullable(),
    clientId: z.string().nullable(),
  }),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
  action: z.enum(AUDIT_ACTIONS),
  changes: z
    .union([
      z.object({ after: z.record(z.string(), z.unknown()) }),
      z.object({
        before: z.record(z.string(), z.unknown()),
        after: z.record(z.string(), z.unknown()),
      }),
      z.object({ before: z.record(z.string(), z.unknown()) }),
    ])
    .optional(),
});

function applyRedactions(
  entityType: EntityType,
  changes: AuditChanges | undefined,
): AuditChanges | undefined {
  if (!changes) return undefined;
  const before = "before" in changes ? redact(entityType, changes.before) : undefined;
  const after = "after" in changes ? redact(entityType, changes.after) : undefined;
  if (before && after) return { before, after };
  if (after) return { after };
  if (before) return { before };
  return undefined;
}

export async function recordAudit(db: Database, input: AuditInput): Promise<void> {
  try {
    const parsed = inputSchema.parse(input);
    const cleaned = applyRedactions(parsed.entityType, parsed.changes as AuditChanges | undefined);
    await db.insert(auditLog).values({
      organizationId: parsed.organizationId,
      actorType: parsed.actor.type,
      actorUserId: parsed.actor.userId,
      actorUserName: parsed.actor.userName,
      actorTokenId: parsed.actor.tokenId,
      actorTokenName: parsed.actor.tokenName,
      actorClientId: parsed.actor.clientId,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      action: parsed.action,
      changes: cleaned ?? null,
    });
  } catch (err) {
    console.warn("[audit] insert failed", {
      org: input.organizationId,
      actorType: input.actor?.type,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export function diffChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (!Object.is(before[key], after[key])) {
      b[key] = before[key];
      a[key] = after[key];
    }
  }
  return { before: b, after: a };
}
