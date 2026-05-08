# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────
# MawaridX — Production Dockerfile (multi-stage)
# Stack: Next.js 16 + Prisma 7 + better-sqlite3
# ──────────────────────────────────────────────────────────

# ============ Stage 1: deps (install + generate Prisma client) ============
FROM node:22-alpine AS deps
WORKDIR /app

# better-sqlite3 + Prisma engines need build tools BEFORE npm ci runs.
# openssl is required by Prisma's query engine on Alpine.
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Copy dependency manifests AND prisma schema so prisma generate can run
# in this stage. This produces node_modules/.prisma which the builder
# and runner stages then COPY out — without this, the .prisma directory
# never exists and later COPY --from=... lookups fail with
# "/app/node_modules/.prisma: not found".
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
RUN npx prisma generate

# ============ Stage 2: builder (compile Next.js) ============
FROM node:22-alpine AS builder
WORKDIR /app

# Same toolchain — Next.js build may invoke native compilers
RUN apk add --no-cache libc6-compat openssl python3 make g++

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# node_modules already includes Prisma's runtime; src/generated/prisma is
# produced by `prisma generate` and is gitignored, so it does NOT arrive
# via `COPY . .`. Regenerate inside this stage so the import
# `@/generated/prisma/client` in src/lib/prisma.ts resolves.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Build Next.js (uses standalone output — see next.config.ts)
RUN npm run build

# ============ Stage 3: runner (minimal final image) ============
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone Next.js output — includes minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Prisma + native modules at runtime.
#
# We copy the FULL node_modules from the builder rather than cherry-picking
# specific packages. Next.js standalone bundles a minimal node_modules that
# covers the server runtime, but the Prisma 7 CLI (invoked by
# docker-entrypoint.sh for `migrate deploy` / `db push`) pulls in transitive
# deps like `effect` (via @prisma/config) that the bundle omits, breaking
# first-run migrations with "Cannot find module 'effect'". Trading ~50 MB
# of image size for a node_modules that does not silently miss deps.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts                ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules                    ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src/generated                   ./src/generated

# Entrypoint: applies prisma migrations then starts Next.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Persistent storage targets (mounted from compose)
RUN mkdir -p /app/prisma /app/backups /app/public/uploads \
 && chown -R nextjs:nodejs /app/prisma /app/backups /app/public/uploads

USER nextjs

EXPOSE 3000

# Healthcheck — Next.js responds on /
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
