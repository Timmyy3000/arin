import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { serviceTokens } from "./settings";

// audit_log is APPEND-ONLY. The application layer has no UPDATE or DELETE paths
// against this table. Direct DB writes that mutate or remove rows are
// intentionally out-of-band and require explicit human judgment.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorUserName: text("actor_user_name"),
    actorTokenId: text("actor_token_id").references(() => serviceTokens.id, {
      onDelete: "set null",
    }),
    actorTokenName: text("actor_token_name"),
    actorClientId: text("actor_client_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_org_created_idx").on(table.organizationId, table.createdAt.desc()),
    index("audit_log_org_actor_user_idx").on(
      table.organizationId,
      table.actorUserId,
      table.createdAt.desc(),
    ),
    index("audit_log_org_entity_created_idx").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.createdAt.desc(),
    ),
  ],
);
