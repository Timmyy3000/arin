import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { personaEnum, temperatureEnum } from "./enums";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    employeeCount: integer("employee_count"),
    description: text("description"),
    temperature: temperatureEnum("temperature"),
    temperatureUpdatedAt: timestamp("temperature_updated_at", { withTimezone: true }),
    lastSignalAt: timestamp("last_signal_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("companies_org_domain_unique").on(table.organizationId, table.domain)],
);

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  persona: personaEnum("persona").notNull().default("unknown"),
  engagement: temperatureEnum("engagement"),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
