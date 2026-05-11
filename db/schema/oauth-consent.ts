import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

export const oauthConsentScope = pgTable("oauth_consent_scope", {
  consentCode: text("consent_code").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  resource: text("resource").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
