import type { Database } from "@/db/client";

export type McpContext = {
  organizationId: string;
  db: Database;
};

export class McpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}
