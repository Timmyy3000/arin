#!/bin/sh
set -e

echo "running migrations..."
bun run db/migrate.ts

echo "running seed..."
bun run db/seed.ts

echo "starting next..."
exec bun run start
