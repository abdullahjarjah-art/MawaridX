# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────
# MawaridX — Production Dockerfile (multi-stage)
# Stack: Next.js 16 + Prisma 7 + better-sqlite3
# ──────────────────────────────────────────────────────────

# ============ Stage 1: deps (install + generate Prisma client) ============
FROM node:20-alpine AS deps
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
FROM node:20-alpine AS builder
WORKDIR /app

# Same toolchain — Next.js build may invoke native compilers
RUN apk add --no-cache libc6-compat openssl python3 make g++

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# node_modules already includes the generated Prisma client from deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js (uses standalone output — see next.config.ts)
RUN npm run build

# ============ Stage 3: runner (minimal final image) ============
FROM node:20-alpine AS runner
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

# Prisma assets needed at runtime: schema + migrations + generated client + native binaries
COPY --from=builder --chown=nextjs:nodejs /app/prisma                  ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma          ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma           ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma          ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3   ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings         ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=nextjs:nodejs /app/src/generated                 ./src/generated

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
