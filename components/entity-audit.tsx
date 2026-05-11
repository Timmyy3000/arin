import { db } from "@/db/client";
import type { AuditRow, EntityType } from "@/lib/audit";
import { getEntityAudit } from "@/lib/audit";
import { EntityAuditClient } from "./entity-audit-client";

type Props = { entityType: EntityType; entityId: string; orgId: string };

export async function EntityAudit({ entityType, entityId, orgId }: Props) {
  const rows = await getEntityAudit(db(), orgId, entityType, entityId);
  if (rows.length === 0) return null;
  const serializable = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
  return <EntityAuditClient rows={serializable} />;
}

export type SerializableAuditRow = Omit<AuditRow, "createdAt"> & { createdAt: string };
