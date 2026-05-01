<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Arin agent rules

## Stack

- **Runtime / package manager / test runner:** Bun (`bun install`, `bun test`, `bun run`).
- **Framework:** Next.js 16 (App Router, Server Components, async `cookies`/`headers`/`params`).
- **Database:** Postgres 16 + Drizzle ORM. Schema in `db/schema/`, migrations in `db/migrations/`.
- **Auth:** Better Auth with the `organization` plugin. Routes mounted at `app/api/auth/[...all]/route.ts`.
- **Multi-tenant:** Every domain table has `organization_id` (FK to Better Auth's `organization`). All queries must filter by org.

## Workflow

- **TDD.** Write a test first under `tests/`, watch it fail, make it pass.
- **Run before pushing:** `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`.
- **Test DB:** `docker compose -f docker-compose.test.yml up -d` (boots Postgres on 5434), then `TEST_DATABASE_URL=postgres://arin:arin@localhost:5434/arin_test bun test`.
- **Commits:** conventional (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Atomic. Commit after each meaningful unit of work — don't batch.
- **Branches:** `ft/feature-name`, `fix/bug-description`, `hot/urgent-fix`.

## Code style

- **No comments by default.** Add a one-liner only when the *why* is non-obvious. Never multi-line blocks.
- **Simplest data shape.** Prefer `string[]` over `{ key, value }[]` unless a reader actually needs richer structure.
- **No vendor lock-in in OSS code.** Don't pull in hosted services (Clerk, Vercel-only APIs, etc.) when an OSS equivalent exists.

## What lives where

- `app/` — Next.js routes (App Router). Auth handler at `app/api/auth/[...all]/route.ts`.
- `db/schema/` — Drizzle table definitions. Re-exported from `db/schema/index.ts`.
- `db/migrations/` — generated SQL migrations. Never edit by hand.
- `db/seed.ts` — first-boot idempotent seed (default org, pipeline, admin from env).
- `db/migrate.ts` — runs migrations, used by Docker entrypoint.
- `lib/auth.ts` — Better Auth server config.
- `lib/auth-client.ts` — Better Auth client (React hooks).
- `lib/env.ts` — Zod-validated env access.
- `tests/` — bun:test suites. `setup.ts` boots migrations once and exposes `resetDb()` and `testDb`.
- `scripts/entrypoint.sh` — Docker container entrypoint (migrate → seed → start).

## Commit Co-Author Policy

When an AI agent materially contributed, add a `Co-authored-by:` trailer with the agent's GitHub account address. Standard identities:

- `Claude <81847+claude@users.noreply.github.com>`
- `Codex <codex@openai.com>`
- `Cursor Agent <199161495+cursoragent@users.noreply.github.com>`

If multiple agents contributed, add one trailer per agent.

## Database changes

- Edit a file in `db/schema/`.
- Run `bun run db:generate -- --name your-change` to produce a migration.
- Inspect the generated SQL in `db/migrations/`. If it's wrong, fix the schema and regenerate (delete the bad migration first).
- Tests will pick up the new migration on the next run via `tests/setup.ts`.

## Adding a new MCP tool (Phase 3+)

- All MCP tools live in `lib/mcp/`.
- Each tool: explicit Zod input schema, returns structured JSON, scoped to the calling token's `organization_id`.
- Add a test in `tests/mcp/` that round-trips input → DB → output.
