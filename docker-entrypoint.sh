#!/bin/sh
# ──────────────────────────────────────────────────────────
# MawaridX — Container entrypoint
# 1. Apply Prisma migrations (idempotent — safe on every restart)
# 2. Exec the main process (node server.js)
# ──────────────────────────────────────────────────────────
set -e

echo "[entrypoint] MawaridX container starting..."
echo "[entrypoint] DATABASE_URL=${DATABASE_URL}"

# ── One-shot legacy DB migration ─────────────────────────────────────
# Older deployments mounted the volume at /app/prisma, which masked
# schema.prisma. We now mount at /app/data. If an operator follows the
# upgrade procedure (mount the OLD volume temporarily at /app/legacy-db
# during a one-time boot), this block copies the DB into the new layout.
if [ -f "/app/legacy-db/hr.db" ] && [ ! -f "/app/data/hr.db" ]; then
  echo "[entrypoint] Migrating legacy DB from /app/legacy-db/ → /app/data/"
  cp /app/legacy-db/hr.db     /app/data/hr.db
  cp /app/legacy-db/hr.db-shm /app/data/hr.db-shm 2>/dev/null || true
  cp /app/legacy-db/hr.db-wal /app/data/hr.db-wal 2>/dev/null || true
  echo "[entrypoint] Legacy DB migration complete."
fi
mkdir -p /app/data

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
#
# Prisma 7 reads `datasource.url` from prisma.config.ts (not schema.prisma),
# and removed the `--skip-generate` flag from `db push`. Both commands now
# use the config file's URL automatically.
if [ -d "./prisma/migrations" ] && [ -n "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Applying Prisma migrations..."
  node "${PRISMA_CLI}" migrate deploy --schema=./prisma/schema.prisma || {
    echo "[entrypoint] migrate deploy failed — falling back to db push (first-run scenario)"
    node "${PRISMA_CLI}" db push --schema=./prisma/schema.prisma --accept-data-loss
  }
else
  echo "[entrypoint] No migrations dir found — running db push (development schema sync)"
  node "${PRISMA_CLI}" db push --schema=./prisma/schema.prisma --accept-data-loss
fi

echo "[entrypoint] Database ready. Launching application..."
exec "$@"
