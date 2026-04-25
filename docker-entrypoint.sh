#!/bin/sh
# ──────────────────────────────────────────────────────────
# MawaridX — Container entrypoint
# 1. Apply Prisma migrations (idempotent — safe on every restart)
# 2. Exec the main process (node server.js)
# ──────────────────────────────────────────────────────────
set -e

echo "[entrypoint] MawaridX container starting..."
echo "[entrypoint] DATABASE_URL=${DATABASE_URL}"

# Call the Prisma CLI via its package entry point directly to avoid
# any reliance on node_modules/.bin/ symlinks (which can be brittle
# inside multi-stage Docker images).
PRISMA_CLI="./node_modules/prisma/build/index.js"

if [ ! -f "${PRISMA_CLI}" ]; then
  echo "[entrypoint] FATAL: prisma CLI not found at ${PRISMA_CLI}"
  exit 1
fi

# Run migrations only if a migrations directory exists in the image.
# `migrate deploy` is the production-safe command — it never prompts,
# never resets the DB, and only applies committed migrations.
if [ -d "./prisma/migrations" ] && [ -n "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Applying Prisma migrations..."
  node "${PRISMA_CLI}" migrate deploy --schema=./prisma/schema.prisma || {
    echo "[entrypoint] migrate deploy failed — falling back to db push (first-run scenario)"
    node "${PRISMA_CLI}" db push --schema=./prisma/schema.prisma --skip-generate
  }
else
  echo "[entrypoint] No migrations dir found — running db push (development schema sync)"
  node "${PRISMA_CLI}" db push --schema=./prisma/schema.prisma --skip-generate
fi

echo "[entrypoint] Database ready. Launching application..."
exec "$@"
