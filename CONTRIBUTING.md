# Contributing to Arin

Thanks for taking a look. Arin is an MCP-native CRM surface — a place AI agents (over MCP) write to and humans read from.

## Local setup

Prerequisites: Bun 1.2+, Docker, Node 20+ (only for editor tooling).

```bash
git clone <your-fork> arin
cd arin
bun install
cp .env.example .env
# edit .env: set BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# boot the dev database
docker compose up -d postgres

# run migrations and seed
bun run db:migrate
bun run seed

# start the app
bun run dev
```

## Tests

```bash
docker compose -f docker-compose.test.yml up -d
TEST_DATABASE_URL=postgres://arin:arin@localhost:5434/arin_test bun test
```

We follow TDD: write a failing test, then write the code to make it pass.

## Branches

- `ft/feature-name` — new features
- `fix/bug-description` — bug fixes
- `hot/urgent-fix` — urgent fixes

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change without behavior change
- `test:` — tests only
- `chore:` — tooling, deps, infra

If an AI agent materially contributed, add a `Co-authored-by:` trailer (see `AGENTS.md`).

## Pull requests

- One logical change per PR.
- Aim for under 400 lines of diff. Split when bigger.
- Pre-submission checklist:
  - [ ] `bun run lint` clean
  - [ ] `bun run typecheck` clean
  - [ ] `bun test` green
  - [ ] `bun run build` succeeds
  - [ ] Self-reviewed your own diff
  - [ ] No `console.log`s, no commented-out code
  - [ ] Tests added/updated

PR description template:

```markdown
## Summary
[1–2 sentences]

## Changes
- [bullet]

## Test plan
- [bullet]

## Screenshots (if UI)
```

## Code style

- No comments by default. One short line only when the *why* is non-obvious.
- Simplest data shape (`string[]` over `{key, value}[]`) unless richer structure is genuinely needed.
- No hosted SaaS dependencies in core (Clerk, Vercel-only APIs, etc.). OSS equivalents only.
- Server Components by default; reach for `'use client'` only for interactivity.

## License

MIT. By contributing you agree your contributions are licensed under MIT.
