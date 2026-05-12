import type { Database } from "@/db/client";
import type { Actor } from "@/lib/audit";

export type McpContext = {
  organizationId: string;
  db: Database;
  actor: Actor;
};

export class McpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}
