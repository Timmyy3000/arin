import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { companies, people } from "./companies";
import { deals } from "./deals";
import { taskPriorityEnum, taskStatusEnum, taskTypeEnum } from "./enums";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    reasoning: text("reasoning"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    type: taskTypeEnum("type").notNull().default("other"),
    status: taskStatusEnum("status").notNull().default("open"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    assigneeUserId: text("assignee_user_id").references(() => user.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_org_status_priority_idx").on(table.organizationId, table.status, table.priority),
  ],
);
