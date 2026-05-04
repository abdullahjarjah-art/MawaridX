# MawaridX — Hostinger VPS Deployment Guide

Step-by-step guide to deploy MawaridX on a Hostinger VPS using
Docker Manager. This setup runs three tenant app containers behind
a single Nginx reverse proxy on the same VPS.

---

## 1. Prerequisites

- Hostinger VPS plan with **Docker Manager** enabled (KVM 2 or higher).
- A domain you control (e.g. `mawaridx.com`) with DNS access.
- Three subdomains pointed at your VPS IP:
  - `company-a.mawaridx.com`
  - `company-b.mawaridx.com`
  - `company-c.mawaridx.com`
- (Optional) A wildcard DNS record (`*.mawaridx.com`) if you plan to
  add tenants frequently — pairs well with a Let's Encrypt wildcard cert.

---

## 2. Connect the GitHub Repo to Hostinger

1. Open **Hostinger hPanel → VPS → Docker Manager**.
2. Click **Create new project**.
3. Select **Docker Compose from URL**.
4. Repository URL: `https://github.com/abdullahjarjah-art/MawaridX`
5. Branch: `main`
6. Compose file path: `docker-compose.yml` (auto-detected at root).
7. Click **Continue** — Hostinger will clone the repo. Don't start
   the build yet; first set the environment variables.

---

## 3. Set Environment Variables in Hostinger

In the Docker Manager UI, paste each variable below. Generate strong
secrets where indicated.

| Variable | How to generate / set |
|---|---|
| `JWT_SECRET` | Run `openssl rand -base64 64` and paste the result. **Required.** |
| `SUPER_ADMIN_EMAILS` | Comma-separated owner emails (e.g. `you@yourdomain.com`). These accounts trigger 2FA OTP login. |
| `BACKUP_INTERVAL_HOURS` | `24` (default). Lower for more frequent SQLite backups. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Run `npx web-push generate-vapid-keys` locally. Paste the **public** key. |
| `VAPID_PRIVATE_KEY` | From the same command. Paste the **private** key. |
| `VAPID_EMAIL` | `mailto:admin@mawaridx.com` |
| `COMPANY_A_NAME` | Display name for tenant A (e.g. `Al-Noor Co.`). |
| `COMPANY_A_URL` | Public URL of tenant A (`https://company-a.mawaridx.com`). |
| `COMPANY_B_NAME` / `COMPANY_B_URL` | Same for tenant B. |
| `COMPANY_C_NAME` / `COMPANY_C_URL` | Same for tenant C. |

> **Note:** SMTP credentials are configured per-tenant inside the app
> (Settings → Email Settings) and stored in each tenant's database.
> No SMTP env vars needed at the platform level.

---

## 4. First Build & Launch

1. Click **Build & Start** in Hostinger Docker Manager.
2. The first build takes 5–8 minutes (installs deps, compiles
   `better-sqlite3` natively, runs `next build`).
3. Watch the logs — you should see, for each tenant:
   ```
   [entrypoint] Applying Prisma migrations...
   [entrypoint] Database ready. Launching application...
   ▲ Next.js 16.2.1
   - Local:        http://localhost:3000
   ```
4. Once all three apps and nginx report **healthy**, you're live on HTTP.

---

## 5. First-Run Database Setup

The entrypoint script (`docker-entrypoint.sh`) runs
`prisma migrate deploy` automatically on every container start. On the
very first run with an empty volume, it falls back to `prisma db push`
to create the schema from scratch.

To create the **first super admin user** in tenant A:

```bash
# SSH into the VPS
docker exec -it mawaridx-company-a sh

# Inside the container:
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('ChangeMe@123', 10);
  await p.user.upsert({
    where: { email: 'admin@mawaridx.com' },
    update: {},
    create: { email: 'admin@mawaridx.com', password: hash, role: 'admin' },
  });
  console.log('Admin user ready: admin@mawaridx.com / ChangeMe@123');
  await p.\$disconnect();
})();
"
```

**Important:** Log in immediately, change the password, and configure
SMTP in Settings so 2FA OTP emails can be delivered.

---

## 6. SSL with Let's Encrypt

### Option A — Per-subdomain certificates

```bash
# On the VPS
docker run --rm -it \
  -v $(pwd)/ssl:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d company-a.mawaridx.com \
  -d company-b.mawaridx.com \
  -d company-c.mawaridx.com \
  --email admin@mawaridx.com --agree-tos --non-interactive
```

### Option B — Wildcard certificate (recommended for multi-tenant)

Requires DNS-01 challenge with your DNS provider's API:

```bash
docker run --rm -it \
  -v $(pwd)/ssl:/etc/letsencrypt \
  certbot/certbot certonly --manual --preferred-challenges dns \
  -d "*.mawaridx.com" -d mawaridx.com \
  --email admin@mawaridx.com --agree-tos
```

Follow the TXT record prompts. Certs land in `./ssl/live/mawaridx.com/`.

### Activate HTTPS in Nginx

1. Open `nginx.conf`.
2. Uncomment the `server { listen 443 ssl ... }` block at the bottom.
3. In the `listen 80` block, swap the proxy logic for the redirect:
   ```nginx
   return 301 https://$host$request_uri;
   ```
4. Restart Nginx only (no app rebuild needed):
   ```bash
   docker compose restart nginx
   ```

### Auto-renewal cron (run on host)

```cron
0 3 * * * docker run --rm -v /path/to/ssl:/etc/letsencrypt -v certbot-www:/var/www/certbot certbot/certbot renew --quiet && docker compose restart nginx
```

---

## 7. Adding a New Tenant Later

1. **DNS:** Point `company-d.mawaridx.com` (or your chosen subdomain) at the VPS IP.
2. **Compose:** Add a new service block in `docker-compose.yml` mirroring `hr-company-c`:
   ```yaml
   hr-company-d:
     <<: *app-common
     container_name: mawaridx-company-d
     environment:
       # ...repeat the common env block...
       COMPANY_NAME: ${COMPANY_D_NAME}
       NEXT_PUBLIC_APP_URL: ${COMPANY_D_URL}
     volumes:
       - company-d-db:/app/prisma
       - company-d-uploads:/app/public/uploads
       - company-d-backups:/app/backups
   ```
3. **Volumes:** Add `company-d-db`, `company-d-uploads`, `company-d-backups`
   to the `volumes:` section.
4. **Nginx:** Add a line to the `map $host $tenant_upstream` block:
   ```nginx
   company-d.mawaridx.com  "hr-company-d:3000";
   ```
5. **Env:** Add `COMPANY_D_NAME` and `COMPANY_D_URL` to Hostinger env vars.
6. Run `docker compose up -d hr-company-d` and `docker compose restart nginx`.

The `new-tenant.sh` script in the repo is a development helper for
local cloning; it is **not** used in this VPS deployment (the compose
file plus volumes is the production model).

---

## 8. Day-2 Operations

### View logs

```bash
docker compose logs -f hr-company-a       # one tenant
docker compose logs -f --tail=100 nginx   # nginx access/error
docker compose ps                         # health status of all services
```

### Restart a service

```bash
docker compose restart hr-company-a   # zero downtime for the others
docker compose restart nginx          # after editing nginx.conf
docker compose down && docker compose up -d   # full restart
```

### Backups

The app auto-creates SQLite backups every `BACKUP_INTERVAL_HOURS` and
keeps the last 14 in `/app/backups` (per-tenant volume). Trigger a
manual backup from the **Settings → Backups** page in the app.

#### Pull a backup from the VPS to your laptop

```bash
# List available backups inside the container
docker exec mawaridx-company-a ls -lh /app/backups

# Copy a specific backup file to the host
docker cp mawaridx-company-a:/app/backups/backup-2026-04-25T03-00-00.db ./
```

### Restoring from a backup

```bash
# Stop the tenant
docker compose stop hr-company-a

# Replace the DB file inside the volume
docker run --rm -v hr-system_company-a-db:/data -v $(pwd):/backup alpine \
  cp /backup/backup-2026-04-25T03-00-00.db /data/hr.db

# Start it again
docker compose up -d hr-company-a
```

### Upgrading the app

```bash
git pull origin main
docker compose build --no-cache
docker compose up -d
```

The entrypoint will apply any new Prisma migrations automatically.

### Rotating `JWT_SECRET`

Update the env var in Hostinger UI and restart all app containers.
This invalidates every active session — users will need to log in again.

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` | Tenant container not healthy. `docker compose logs hr-company-a` |
| `wrong ELF class` on `better-sqlite3` | Image built on different arch — rebuild with `--no-cache` on the VPS |
| OTP emails never arrive | SMTP not configured. Log in as admin → Settings → Email Settings |
| `Cannot find module './server.js'` | `output: 'standalone'` missing in `next.config.ts` (already fixed) |
| Migrations fail on first run | Empty volume — entrypoint falls back to `db push` automatically |

---

## 10. Security Checklist Before Going Live

- [ ] `JWT_SECRET` is at least 64 characters and unique to production
- [ ] `SUPER_ADMIN_EMAILS` matches actual owner email(s) — 2FA OTP requires SMTP
- [ ] Default admin password changed (`ChangeMe@123` is for first login only)
- [ ] SMTP configured per tenant (so password reset + 2FA work)
- [ ] HTTPS active (Let's Encrypt cert installed, port 80 redirects)
- [ ] Firewall: only ports 80/443 + your SSH port open on the VPS
- [ ] First manual backup pulled to your laptop and verified restorable
- [ ] DNS records have low TTL (300s) until you confirm everything works

---

Built with Next.js 16 · Prisma 7 · SQLite · Docker · Nginx
