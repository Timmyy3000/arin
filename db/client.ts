import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(databaseUrl: string) {
  const queryClient = postgres(databaseUrl, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(queryClient, { schema });
}

let cached: Database | undefined;
export function db(): Database {
  if (!cached) cached = createDb(env.DATABASE_URL);
  return cached;
}
