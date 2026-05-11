import { db } from "@/db/client";
import type { AuditRow, EntityType } from "@/lib/audit";
import { getEntityAudit, getEntityCreateAudit } from "@/lib/audit";
import { EntityAuditClient } from "./entity-audit-client";

type Props = { entityType: EntityType; entityId: string; orgId: string };

export async function EntityAudit({ entityType, entityId, orgId }: Props) {
  const [createRow, recent] = await Promise.all([
    getEntityCreateAudit(db(), orgId, entityType, entityId),
    getEntityAudit(db(), orgId, entityType, entityId),
  ]);
  if (recent.length === 0 && !createRow) return null;
  return (
    <EntityAuditClient
      created={createRow ? toSerializable(createRow) : null}
      recent={recent.map(toSerializable)}
    />
  );
}

function toSerializable(r: AuditRow): SerializableAuditRow {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export type SerializableAuditRow = Omit<AuditRow, "createdAt"> & { createdAt: string };
