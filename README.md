# Arin

> An MCP-native CRM surface. AI agents write to it over MCP; humans read it in a clean web UI.

Arin is a lightweight CRM built for one job: be the place an AI agent (Claude, via MCP) saves the companies it researches, the people it finds, the signals it picks up, and the tasks it thinks you should action — and be the place you open to scan all of that without thinking.

It is **not** a chat app, an analytics tool, a workflow builder, or a marketing platform. It is a *surface*.

## Stack

- Next.js 16 (App Router) + React 19
- Postgres 16 + Drizzle ORM
- Better Auth (with organizations plugin)
- Bun (runtime, package manager, test runner)
- Tailwind v4

## Quickstart (local dev)

Prerequisites: Bun 1.2+ and Docker.

```bash
bun install
cp .env.example .env
# edit .env: set BETTER_AUTH_SECRET (32+ chars), ADMIN_EMAIL, ADMIN_PASSWORD

docker compose up -d postgres
bun run db:migrate
bun run seed
bun run dev
```

Open <http://localhost:3000> and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Self-host (Docker)

```bash
cp .env.example .env
# edit .env: at minimum BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d
```

Migrations and seed run automatically on first boot.

## Tests

```bash
docker compose -f docker-compose.test.yml up -d
TEST_DATABASE_URL=postgres://arin:arin@localhost:5434/arin_test bun test
```

## Status

- **Phase 1: Foundation** ✓ — schema, auth, seed, Docker, tests.
- **Phase 2: Read-only UI** — in progress.
- **Phase 3: MCP server + writes** — planned.
- **Phase 4: Cron + polish** — planned.

## License

MIT.
