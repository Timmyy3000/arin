import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16),
  APP_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  DEFAULT_ORG_NAME: z.string().default("Default"),
  DEFAULT_ORG_SLUG: z.string().default("default"),
});

export type Env = z.infer<typeof schema>;

const isBuilding = process.env.NEXT_PHASE === "phase-production-build";

const buildDefaults = {
  DATABASE_URL: "postgres://build:build@localhost:5432/build",
  BETTER_AUTH_SECRET: "build-time-placeholder-secret-32-chars",
  APP_URL: "http://localhost:3000",
};

export const env: Env = isBuilding
  ? schema.parse({ ...buildDefaults, ...process.env })
  : schema.parse(process.env);
