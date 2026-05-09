# MawaridX — Upgrade Guide

## v-next: DB volume layout change

### Why
The DB volume used to mount at `/app/prisma`, which masked the entire
`prisma/` directory inside the image — including `schema.prisma` and the
`migrations/` folder. On any redeploy, schema changes silently failed
because Prisma could not see the updated files.

### What changed
The DB now lives at `/app/data/hr.db`. The volume mounts at `/app/data`
only, so `schema.prisma` and `migrations/` are always picked up from
the rebuilt image.

### Migration procedure (for existing deployments)

The volume name and contents stay the same — only the mount point
inside the container changes. To preserve your data:

#### Option 1: Rename the volume (preferred, single tenant)

```bash
# 1. Stop the stack
docker compose down

# 2. Find the existing volume
docker volume ls | grep company-a-db

# 3. Create the new layout: copy old volume → new volume on a helper container
docker run --rm \
  -v <stack>_company-a-db:/legacy \
  -v <stack>_company-a-db-new:/new \
  alpine sh -c "mkdir -p /new && cp /legacy/hr.db* /new/ 2>/dev/null || true"

# 4. Swap volume names in docker-compose.yml or remove the old volume
#    and rename the new one to match.

# 5. docker compose up -d
```

#### Option 2: Use the legacy mount path (zero data loss, one extra restart)

Add a temporary mount during the FIRST boot under the new image, then
remove it once migration logs confirm success.

```yaml
# docker-compose.yml — TEMPORARY, only for the upgrade boot
services:
  hr-company-a:
    volumes:
      - company-a-db:/app/data            # NEW location
      - company-a-db-legacy:/app/legacy-db # OLD volume (read existing data)
      - company-a-uploads:/app/public/uploads
      - company-a-backups:/app/backups
```

Where `company-a-db-legacy` is the old `company-a-db` renamed to point at
the original data. The entrypoint script will detect `/app/legacy-db/hr.db`
and copy it to `/app/data/hr.db` on first boot. Look for this log line:

```
[entrypoint] Migrating legacy DB from /app/legacy-db/ → /app/data/
```

After confirming the migration ran:

```yaml
# Remove the legacy mount in subsequent deployments
volumes:
  - company-a-db:/app/data
  - company-a-uploads:/app/public/uploads
  - company-a-backups:/app/backups
```

### Verification checklist

- [ ] `docker compose exec hr-company-a ls /app/data` shows `hr.db`
- [ ] `docker compose exec hr-company-a ls /app/prisma/schema.prisma` resolves
- [ ] `docker compose exec hr-company-a ls /app/prisma/migrations` lists folders
- [ ] App login still works with existing user accounts
- [ ] `/api/auth/me` returns the existing employee record

---

## Initial admin bootstrap

### Why
Previously, the very first user to register on a fresh tenant always
received `role: "employee"` — even if their email was on the
`SUPER_ADMIN_EMAILS` list. The proxy then redirected them to `/portal`
with no way to reach the admin tools.

### What changed
`POST /api/auth/register` now checks whether the DB has zero users
AND the registering email is on `SUPER_ADMIN_EMAILS`. If both are true,
the new user is created with `role: "admin"`.

### Operational impact

- **No-op for existing deployments**: if the DB already has any user, the
  bootstrap branch is skipped.
- **Fresh tenants**: the first registration with a super-admin email now
  lands directly in the admin dashboard. Set `SUPER_ADMIN_EMAILS` per
  tenant if you need different owners per company.
