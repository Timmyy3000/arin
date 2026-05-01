import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(databaseUrl: string) {
  const queryClient = postgres(databaseUrl);
  return drizzle(queryClient, { schema });
}

let cached: Database | undefined;
export function db(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    cached = createDb(url);
  }
  return cached;
}
