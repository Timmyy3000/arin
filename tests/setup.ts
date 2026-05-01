import { afterAll, beforeAll } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import postgres from "postgres";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required for tests. See .env.example or docker-compose.test.yml.",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-16-chars-long";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const client = postgres(testDatabaseUrl, { max: 1 });
const db = drizzle(client);

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./db/migrations" });
});

afterAll(async () => {
  await client.end({ timeout: 5 });
});

export async function resetDb(): Promise<void> {
  const tables = [
    "service_tokens",
    "app_settings",
    "notes",
    "meeting_attendees",
    "meetings",
    "tasks",
    "deals",
    "stages",
    "pipelines",
    "research",
    "signals",
    "people",
    "companies",
    "invitation",
    "member",
    "session",
    "account",
    "verification",
    "user",
    "organization",
  ];
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`));
}

export { db as testDb };
