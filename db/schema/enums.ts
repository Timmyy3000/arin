import { pgEnum } from "drizzle-orm/pg-core";

export const temperatureEnum = pgEnum("temperature", ["cold", "warm", "hot", "on_fire"]);
export const personaEnum = pgEnum("persona", [
  "champion",
  "decision_maker",
  "technical_evaluator",
  "end_user",
  "unknown",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["urgent", "high", "medium", "low"]);
export const taskTypeEnum = pgEnum("task_type", ["call", "email", "linkedin", "research", "other"]);
export const taskStatusEnum = pgEnum("task_status", ["open", "done", "dismissed"]);
export const noteAuthorEnum = pgEnum("note_author", ["user", "agent"]);
