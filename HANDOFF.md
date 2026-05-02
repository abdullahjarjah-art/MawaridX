# MawaridX — Engineering Handoff

> **Audience**: An AI coding assistant (Claude or similar) picking up
> development on this codebase with no prior context. Read top-to-bottom
> once before touching any file.

> **Repo**: `https://github.com/abdullahjarjah-art/MawaridX`
> **Default branch**: `main`
> **Owner / super-admin email**: `abdullah.j.arjah@gmail.com`
> **Last-known-good commit**: `583aabc` (docker prisma fix + shared image)

---

## 1. Product Summary

**MawaridX** is an Arabic-first, Saudi-compliant **HR management SaaS**.
Each customer ("tenant" = "company") runs in its own isolated Docker
container, sharing the same image. The platform owner ("super admin")
runs multiple companies on a single VPS.

Target market: Saudi small-to-mid businesses (10–1,000 employees).

### Domain features

- Employee master records (Saudi-specific fields: `nationalId`, `iqama`,
  `nationality`, `iqamaExpiry`, `region`, etc.)
- Attendance with optional **GPS geofencing** (per-location radius)
- Shift scheduling (multiple shift templates, per-employee assignment)
- Leave management (annual / sick / emergency, manager + HR two-step
  approval, balance carry-over with cap)
- Payroll: basic + housing/transport/other allowances, auto-computed
  **GOSI** (Saudi social insurance: 9% saudi / 2% non-saudi),
  disciplinary deductions, salary slip PDF export
- Recurring salary **deduction rules** (fixed amount or %, scoped to
  employee or global, with installment counters)
- **Disciplinary actions** (verbal → written → final → suspension →
  deduction) tracked per employee
- Recruitment + applications (lightweight ATS)
- Performance evaluations (period + scored + grade)
- Training catalog + per-employee enrollment
- Saudi **Saudization (Nitaqat)** band tracking with target setting
- Generic employee **request workflow** (leave / loan / exit-return /
  resignation / letter / attendance fix) — manager-then-HR or
  HR-only chains
- Announcements (company-wide or per-department, priority)
- Custodies (equipment / leave-balance ledger / travel tickets)
- Company documents library with per-doc access control
- Per-employee documents (contract, ID, certificates) with expiry
  reminders
- Letters generator (salary cert, employment, experience) → PDF
- Push notifications (Web Push / VAPID)
- Email notifications (per-tenant SMTP, configured in app settings)
- Audit log (all auth + state-change events)
- Saudi public holidays (multi-year preloaded)
- **Per-tenant branding** (logo, colors, CR/VAT/address on documents)
- **Per-tenant feature flags** via `COMPANY_PLAN` env var

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.1** (App Router, Turbopack) — `output: "standalone"` |
| UI runtime | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind 4 + shadcn/ui (components.json present) |
| Icons | lucide-react |
| ORM | **Prisma 7** with `@prisma/adapter-better-sqlite3` |
| Database | **SQLite** (`better-sqlite3@^12`) — one file per tenant container |
| Auth | JWT in httpOnly cookie via `jose@6` |
| Password hashing | `bcryptjs@3` (cost 12) |
| File uploads | `formData.get("file") as File` → magic-byte check → fs/promises writeFile |
| PDF | `jspdf@4` + `jspdf-autotable@5` |
| Excel | `xlsx@0.18` |
| Email | `nodemailer@^7.0.7` (note: 8.x breaks `next-auth` peer dep — DO NOT bump) |
| Push | `web-push@3` |
| Maps | `leaflet@1.9` + `react-leaflet@5` |
| Mobile shell | Capacitor 8 (`@capacitor/core/android/ios`) — present but secondary |
| Auth library | `next-auth@5.0.0-beta.30` + `@auth/prisma-adapter` (NOT used for sessions — custom JWT is the source of truth; next-auth was experimentally added and partially wired) |
| Reverse proxy | Nginx 1.27-alpine |
| Containerization | Docker multi-stage (`node:20-alpine` base) |
| Deployment target | Hostinger Docker Manager on KVM 2 (8 GB) |

**Non-negotiable**: `package.json` says `"nodemailer": "^7.0.7"`. Bumping
to 8.x breaks `npm ci` because `next-auth@5-beta` peer-deps lock it.

---

## 3. Repository Layout

```
hr-system/
├── prisma/
│   ├── schema.prisma                # 25+ models — read this first
│   ├── migrations/                  # 7 migrations (init + 6 incremental)
│   └── hr.db                        # gitignored — created at runtime
├── public/
│   ├── icons/                       # PWA icons
│   └── uploads/                     # gitignored (volume-mounted in prod)
│       ├── avatars/                 # employee photos
│       ├── leaves/                  # leave request attachments
│       ├── company-docs/            # company document files
│       ├── branding/                # tenant logos (NEW)
│       └── employee-docs/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (main)/                  # HR/admin pages — sidebar layout
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── employees/[id]/...
│   │   │   ├── salaries/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── branding/page.tsx
│   │   │   └── ...                  # 24 pages total
│   │   ├── portal/                  # employee self-service
│   │   ├── super-admin/             # platform owner pages
│   │   ├── api/                     # ~80 route handlers
│   │   ├── login/                   # /login, /register, etc.
│   │   ├── layout.tsx               # root: providers + fonts
│   │   ├── page.tsx                 # / → redirects by role
│   │   ├── globals.css
│   │   ├── brand-theme.css
│   │   └── dark-overrides.css
│   ├── components/
│   │   ├── ui/                      # shadcn primitives (button, card, ...)
│   │   ├── sidebar-nav.tsx
│   │   ├── branding-provider.tsx    # client context
│   │   ├── lang-provider.tsx        # ar/en translation context
│   │   ├── theme-provider.tsx
│   │   ├── notification-bell.tsx
│   │   ├── push-notification-button.tsx
│   │   ├── employee-avatar.tsx
│   │   ├── geofence-map.tsx
│   │   ├── map-picker.tsx
│   │   ├── mawaridx-logo.tsx
│   │   └── theme-lang-toggle.tsx
│   ├── lib/                         # 19 modules — domain logic
│   ├── hooks/                       # custom React hooks
│   ├── generated/                   # `prisma generate` output
│   ├── proxy.ts                     # Next.js middleware (renamed file!)
│   └── instrumentation.ts           # boot-time hook
├── scripts/                         # one-off utilities (not run in prod)
├── marketing/                       # sales deck (HTML)
├── Dockerfile                       # 3-stage build
├── docker-compose.yml               # 3 tenant + nginx services
├── docker-entrypoint.sh             # prisma migrate deploy + start
├── nginx.conf                       # subdomain routing map
├── next.config.ts                   # `output: "standalone"`
├── prisma.config.ts                 # adapter wiring
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── components.json                  # shadcn config
├── .dockerignore
├── .env.example
├── package.json
├── package-lock.json
├── README.md
├── README-DEPLOY.md                 # Hostinger walkthrough
├── AGENTS.md                        # IMPORTANT: see §17
├── CLAUDE.md                        # → AGENTS.md
└── HANDOFF.md                       # this file
```

### `AGENTS.md` content (verbatim)

```
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file
structure may all differ from your training data. Read the relevant
guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
```

### Conventions you must respect

- The Next.js middleware lives at **`src/proxy.ts`** (not
  `src/middleware.ts`). Next.js 16 renamed the export. The file
  exports `proxy(req)` and `config.matcher`. **Do not recreate
  `middleware.ts`.**
- `instrumentation.ts` runs once at boot — used for env validation
  and starting auto-backup. Guards on `NEXT_RUNTIME === "nodejs"`.
- Throw `new Error(...)` for fatal env validation, **never
  `process.exit(1)`** — Turbopack flags `process.exit` as Edge-runtime
  incompatible and fails the build.
- Imports use `@/...` (alias to `./src/...`).
- Arabic UI strings are inline in JSX — there is a `t()` helper from
  `LangProvider` for AR↔EN swap, but coverage is partial.
- All API routes use the new App Router signature
  `export async function GET/POST/PATCH/DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> })`.
  Note `params` is a **Promise** — must `await` it.

---

## 4. Multi-Tenant Architecture

### Physical layout (Hostinger VPS)

```
                          ┌─────────────────────────┐
                          │  Hostinger KVM 2 (8 GB) │
                          └─────────────────────────┘
                                       │
       ┌─────────────────────┬─────────┼─────────┬─────────────────────┐
       │                     │         │         │                     │
       ▼                     ▼         ▼         ▼                     ▼
┌─────────────┐     ┌──────────────┐ ┌───────┐ ┌──────────────┐ ┌─────────────┐
│   nginx     │     │ hr-company-a │ │  ...b │ │  hr-company- │ │ Docker      │
│ :80, :443   │────▶│   :3000      │ │       │ │      c       │ │ volumes     │
│ subdomain   │     │  (image)     │ │       │ │  (image)     │ │ company-X-  │
│  routing    │     │ DB volume A  │ │       │ │ DB volume C  │ │ {db,uploads,│
└─────────────┘     └──────────────┘ └───────┘ └──────────────┘ │   backups}  │
       ▲                                                        └─────────────┘
       │
   public Internet
   ── company-a.mawaridx.com ──▶ nginx upstream → hr-company-a:3000
   ── company-b.mawaridx.com ──▶ nginx upstream → hr-company-b:3000
   ── company-c.mawaridx.com ──▶ nginx upstream → hr-company-c:3000
```

### Tenant isolation guarantees

| Layer | How it isolates |
|---|---|
| **Database** | Each tenant has its own SQLite file in its own named volume (`company-a-db`, etc.). No shared DB. |
| **Filesystem** | Each tenant has its own `uploads` and `backups` volumes. |
| **Process** | Separate containers, separate Node.js processes, separate memory. |
| **Network** | Internal `mawaridx-internal` bridge; only `nginx` is host-exposed. |
| **Cookies** | Cookie set without `domain` attribute → scoped to the exact subdomain (browser default). |
| **Routing** | Nginx `map $host $tenant_upstream` directs each subdomain to a specific container. |

### Known weak point

`JWT_SECRET` is currently shared across all tenants (single env var).
A leaked JWT from tenant A would cryptographically verify in tenant B's
container. Practical exploit is gated by the userId not existing in
B's DB, **except for super-admin users whose email matches across
all tenants**. Mitigation: split into `COMPANY_A_JWT_SECRET` etc.
(not yet implemented — see §16 Known Issues).

### Schema model `Company`

Despite the multi-tenant container layout, **the Prisma schema also
contains a `Company` model**. This is **misleading**: no other model
has a `companyId` foreign key. The `Company` table is essentially a
**self-description record per tenant container**, used by the
`/super-admin/companies` UI to list/edit tenants — but the rows live
inside each tenant's own DB. It is *not* a multi-tenant join key.

If you ever refactor toward single-DB multi-tenant, this is the
starting point — but it would require adding `companyId` everywhere.

---

## 5. Database Schema (Prisma)

Path: `prisma/schema.prisma`. Provider: `sqlite` via
`@prisma/adapter-better-sqlite3`. ID strategy: `cuid()`.

### Models (25 total)

#### Identity & Auth
- **User** — `id, email (unique), password, role, resetToken, resetTokenExpiry, failedLoginAttempts, lockedUntil, lastLoginAt, lastLoginIp, passwordChangedAt`. Relation: `employee Employee?`.
- **Setting** — generic `key (unique) → value` JSON-ish blob. Used for `attendance_settings`, `smtp_settings`, `branding`, `saudization_target`, etc.

#### Tenant self-description
- **Company** — `name, commercialReg, adminEmail (unique), adminName, phone, plan, maxEmployees, status, logo, primaryColor, notes, expiresAt`. (See §4 caveat.)

#### Org structure
- **Department** — `name (unique), description, managerId`.
- **WorkLocation** — `name, address, deviceId, latitude, longitude, radius (meters, default 200), active`. Used for geofence check-in.
- **EmployeeWorkLocation** — many-to-many: which locations an employee can check into.

#### Workforce
- **Employee** — central record. Saudi-specific: `nationalId (unique)`, `iqamaExpiry`, `nationality (saudi/non_saudi)`, `region`. Org: `department, jobTitle, position (employee/manager/...), managerId`. Compensation: `basicSalary, housingAllowance, transportAllowance, otherAllowance`. Banking: `bankName, iban`. Employment: `employmentType, startDate, endDate, contractDuration (years), noticePeriodDays (default 60), probationEndDate, status (active/...)`. Relation: `userId (unique)` ↔ `User`.

#### Time tracking
- **Shift** — `name, checkInTime, checkOutTime, breakMinutes, workDays (CSV "0,1,2,3,4"), color, isActive`.
- **EmployeeShift** — `employeeId, shiftId, startDate, endDate?` — historical assignments.
- **Attendance** — `employeeId, date, checkIn?, checkOut?, status (present/late/absent/...), workHours, workLocationId, checkInLocationId, checkOutLocationId, overtimeMinutes`.
- **Leave** — `employeeId, type (annual/sick/emergency/...), startDate, endDate, days, reason, attachmentUrl, status (pending/manager_approved/approved/rejected), managerApprovedBy/At, approvedBy/At`.
- **LeaveBalance** — yearly: `annual (default 30), sick (default 15), emergency (default 5)` + `usedAnnual/usedSick/usedEmergency`.
- **Holiday** — Saudi public holidays preloaded multi-year. `name, date, type (official/religious/national), year`.

#### Pay
- **Salary** — monthly: `month, year, basicSalary, allowances, deductions, bonus, overtimePay, gosiEmployee, gosiEmployer, netSalary, status, paidAt, notes`. Composite key: (employeeId, month, year).
- **SalaryDeductionRule** — recurring: `name, type (fixed/percentage), amount, employeeId? (nullable=global), isActive, totalMonths (0=permanent), appliedMonths`.

#### Discipline & Recruitment
- **Disciplinary** — `employeeId, type (verbal_warning/written_warning/final_warning/suspension/deduction), reason, description, date, issuedBy, penalty, days, status, notes`.
- **Recruitment** — open positions: `jobTitle, department, description, requirements, status (open/closed), openDate, closeDate`.
- **Application** — `recruitmentId, applicantName, email, phone, resumeUrl, status (new/reviewed/interview/hired/rejected), interviewDate`.

#### Performance & Training
- **Evaluation** — `employeeId, period, year, score, grade, answers (JSON), strengths, improvements, goals, evaluatorId, evaluatorName, status (draft/submitted)`.
- **Training** — `title, instructor, startDate, endDate, duration, location, type (internal/external), status (planned/in_progress/completed)`.
- **EmployeeTraining** — enrollment: `employeeId, trainingId, status (enrolled/completed/no_show), completedAt, certificate`.

#### Workflow & Communications
- **Request** — generic workflow: `employeeId, type (leave/attendance_fix/loan/custody/exit_return/resignation/letter), status (pending/manager_approved/approved/rejected), title, details, startDate?, endDate?, amount?, returnDate?, exitTime?, returnTime?, checkType?, managerId, managerNote, managerAt, hrNote, hrAt`.
- **Announcement** — `title, content, scope (company/department), department?, authorId, authorName, priority (normal/important/urgent), active`.
- **Notification** — `recipientId (Employee.id), title, message, type (info/request/approval/rejection), relatedId, read`.

#### Documents & Custody
- **Document** — per-employee files: `employeeId, type (contract/id/certificate/...), name, fileUrl, expiryDate, notes`.
- **Custody** — `employeeId, type (leave_balance/travel_ticket/equipment/other), title, description, quantity, unit, status (pending/approved/rejected), createdBy, approvedAt, employeeNote`.
- **CompanyDocument** — `title, category, fileUrl, fileName, fileSize, fileType, accessLevel (all/department/employee), accessDepts (JSON array), accessEmployeeIds (JSON array), expiryDate, notifyDaysBefore (default 30), notifiedAt, isActive, createdBy, creatorName`.
- **CompanyDocumentDownload** — audit trail of who downloaded what.

#### Misc
- **AuditLog** — `userId, userName, action (create/update/delete/approve/reject/login/...), entity, entityId, details`. Append-only.
- **PushSubscription** — Web Push: `userId, endpoint (unique), auth, p256dh`.

### Migrations history

```
20260330181846_init               — base schema
20260330194131_add_reset_token    — User.resetToken
20260330201047_add_settings       — Setting model
20260331163235_add_manager        — Employee.managerId
20260331163442_add_position       — Employee.position
20260331181559_add_departments    — Department model
20260401180850_add_requests       — Request model
```

Note dates: migrations were generated in 2026 (year on the dev
machine was advanced; this is intentional or harmless — Prisma
treats them as monotonic strings).

When you change `schema.prisma`:
```bash
npx prisma migrate dev --name describe_change
```
This generates a new migration file AND regenerates the client.
**Do not** edit existing migration SQL files; create new ones.

---

## 6. Authentication & Authorization

### Session token

- `src/lib/auth.ts`
- HS256 JWT, 24h lifetime, signed with `JWT_SECRET` (≥32 chars, validated
  at request time via `getSecret()` lazy helper)
- Cookie name `hr_token`, `httpOnly`, `secure` in prod, `sameSite: "strict"`,
  `path: "/"`, no `domain` → tenant-scoped.
- Payload: `{ userId, email, role, employeeId? }`.

### Login flow (`POST /api/auth/login`)

1. IP-based rate limit (`LIMITS.login`: 5/15min, 30min block on overflow)
2. Lookup user by lowercased email
3. **Constant-time-ish bcrypt compare** even on non-existent user (avoids user enumeration)
4. Account lockout check (`lockedUntil > now` → 423)
5. On wrong password: increment `failedLoginAttempts`, lock for 15min if ≥5; send `sendAccountLockedEmail`
6. On correct password: reset counter, write `lastLoginAt/Ip`
7. **If email is in `SUPER_ADMIN_EMAILS`** AND `BYPASS_2FA !== "true"`:
   - Generate 6-digit OTP, store in-memory (10 min TTL) via `src/lib/otp.ts`
   - Email it via SMTP (`sendOtpEmail`)
   - Respond `{ require2fa: true, userId, maskedEmail }`
   - Frontend redirects to OTP entry, calls `POST /api/auth/verify-otp`
8. Otherwise: sign JWT, set cookie, return user info

### Middleware (`src/proxy.ts`)

Runs on every request matching
`/((?!_next/static|_next/image|favicon.ico).*)`:

1. Apply security headers to all responses (CSP, HSTS, X-Frame-Options=DENY, etc.)
2. Bypass auth for `PUBLIC_PATHS`: `/login, /register, /forgot-password, /reset-password, /api/auth/login, /api/auth/register, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/verify-otp` and `/api/auth/logout`
3. No token → 401 (API) or redirect `/login` (page)
4. Invalid token → same
5. **`HR_ONLY_PATHS`** = `[/dashboard, /employees, /attendance, /salaries, /recruitment, /evaluations, /training]` — block `role: "employee"`, redirect to `/portal`
6. **`EMPLOYEE_PATHS`** = `[/portal]` — block non-employees, redirect to `/dashboard`

### Roles

| `User.role` | Created when | Access |
|---|---|---|
| `employee` | `/register` (default) and `POST /api/employees` (HR-created records) | `/portal/*` only |
| `manager` | Manually (no UI) — typically by changing role in DB | Same as employee + `/portal/team-requests`, `/portal/manager-dashboard`, `/portal/evaluations` (team only) |
| `hr` | Manually | All `(main)/*` pages, all admin APIs |
| `admin` | `POST /api/super-admin/companies` (auto-created when super admin provisions a tenant) | **Same as `hr`** — proxy and most API checks treat them identically |

### Super-Admin

- **Not a `role` in DB** — determined by email match against
  `SUPER_ADMIN_EMAILS` env var (`src/lib/super-admin.ts`).
- Logging in as super admin requires OTP (unless `BYPASS_2FA=true`).
- Root page (`/`) redirects super admin to `/super-admin`.
- API guard: `requireSuperAdmin()` in `src/lib/super-admin.ts`.
- The super admin can:
  - View `/super-admin/companies` (lists rows in the **current container's** Company table)
  - Create new Company rows (also creates a `User` with `role: "admin"`)
  - **Cannot** spin up new containers — that's a manual `docker-compose.yml` edit.

### Authorization patterns in API routes

```ts
// At minimum:
const session = await getSession();
if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

// HR-only endpoint:
if (!["hr", "admin"].includes(session.role))
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

// Employee can only access their own data:
if (session.role === "employee" && session.employeeId !== id)
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

// Super admin only:
const r = await requireSuperAdmin();
if (!r.ok) return r.res;
```

---

## 7. API Routes

~80 route handlers under `src/app/api/`. Grouped by domain:

### Auth (`/api/auth/*`)
- `POST /login` — login + 2FA gate (see §6)
- `POST /logout` — clear cookie
- `GET  /me` — current session + employee
- `POST /register` — public; rate-limited 5/15min/IP; always creates `role: "employee"`
- `POST /forgot-password` — emails reset token
- `POST /reset-password` — consumes token
- `POST /verify-otp` — completes super-admin login

### Admin (`/api/admin/*`)
- `GET  /backup` — list backups
- `POST /backup` — trigger manual backup
- `GET  /backup/download?name=...` — stream backup file (returns `new Uint8Array(buf)`, NOT raw `Buffer`)

### Employees
- `GET  /employees?page&pageSize&search&department&managerId&all=1` — paginated; `all=1` returns full list (used for dropdowns)
- `POST /employees` — HR/admin only; creates `User` + `Employee`; sends invite email
- `GET  /employees/[id]` — single
- `PATCH/DELETE /employees/[id]`
- `POST /employees/[id]/photo` — multipart, magic-byte validated, stored in `/uploads/avatars/`
- `POST /employees/[id]/renew-iqama` — bumps `iqamaExpiry`
- `GET  /employees/[id]/documents`, `POST` upload
- `GET  /employees/[id]/custodies`
- `GET  /employees/me` — current employee from session
- `GET  /employees/me/stats` — dashboard widget data
- `GET  /employees/me/custodies`
- `POST /employees/import` — bulk Excel import via `xlsx`
- `GET  /employees/org-chart` — tree

### Attendance / Leave / Shifts
- Standard REST under `/attendance`, `/leaves`, `/shifts`, `/holidays`
- `POST /portal/checkin` — geofence + GPS validated by `WorkLocation.radius` (Haversine in handler)
- `POST /leave-balance/carryover` — annual rollover with cap from settings UI

### Salaries
- `GET  /salaries?month&year&employeeId&all=1`
- `POST /salaries` — bulk-generate or single record. `recalcGosi` flag triggers GOSI recompute. GOSI logic in `calcGosi()`:
  - Saudi: 9% employee + 9% employer (basic only)
  - Non-Saudi: 0% employee + 2% employer (occupational hazards only)
- `PATCH/DELETE /salaries/[id]`
- `/salary-deductions` (CRUD) — recurring rules

### Workflow
- `/requests` (CRUD) + `[id]` for approve/reject — handler reads `body.role` to choose manager-vs-HR path (see §6 caveat: clients send role hint, server doesn't re-derive — minor security issue, mitigated because session is required)
- `/disciplinary` (CRUD)
- `/contracts` + `/contracts/bulk` + `/contracts/renew`

### Documents
- `/documents/[id]`
- `/company-docs` (CRUD), `/company-docs/upload`, `/company-docs/notify` — sends expiry warnings

### Settings
- `/settings/attendance` — fixed/flexible policy, late tolerance
- `/settings/geofence`
- `/settings/smtp` + `/settings/smtp/test`
- `/settings/branding` (NEW) — logo URL + colors + CR/VAT/address
- `/settings/branding/logo` (NEW) — POST upload, DELETE remove

### Other
- `/dashboard` — aggregates: total/active employees, today attendance, pending leaves/requests, iqama renewals due, week chart
- `/saudization` — current Nitaqat band + target
- `/audit-log` — paginated read
- `/notifications` + `/notifications/read`
- `/push/subscribe`, `/push/vapid-key`
- `/upload` — generic single-file
- `/super-admin/companies` (CRUD), `/super-admin/stats`

### Common headers / response shapes

- Success: `NextResponse.json({...})`
- Error: `NextResponse.json({ error: "..." }, { status: 400|401|403|404|429|500 })`
- Pagination response: `{ data, total, page, pageSize, totalPages }`
- Arabic error messages — keep them; the UI displays them directly.
- 429 responses include `Retry-After` and `X-RateLimit-Reset` headers
  (built by `rateLimitResponse` in `src/lib/rate-limit.ts`).

---

## 8. Pages

### `(main)/*` — HR/admin (sidebar layout)
24 pages: `dashboard`, `employees`, `employees/[id]`, `employees/[id]/letter`, `departments`, `org-chart`, `locations`, `attendance`, `shifts`, `holidays`, `calendar`, `requests`, `announcements`, `reports`, `salaries`, `contracts`, `contracts/bulk`, `company-docs`, `recruitment`, `evaluations`, `saudization`, `training`, `audit-log`, `settings`, `settings/branding`.

Layout (`(main)/layout.tsx`) does an SSR check via `getSession()`:
super-admin → redirect to `/super-admin`. Otherwise render
`<SidebarNav />`.

### `portal/*` — employee self-service
14 pages: `portal` (home), `attendance`, `checkin` (geofence map),
`leaves`, `requests`, `salary` (own slips), `custodies`, `calendar`,
`announcements`, `company-docs`, `my-evaluations`, `profile`,
`profile/personal`, `profile/job`, `profile/documents`. Manager
addons: `team-requests`, `manager-dashboard`, `evaluations`.

Layout is `"use client"`, fetches `/api/auth/me` on mount, redirects
non-employees away.

### `super-admin/*`
- `super-admin/page.tsx` — overview stats
- `super-admin/companies/page.tsx` — list/create/edit tenants
- `super-admin/layout.tsx` — SSR-guards on `isSuperAdminEmail`
- `super-admin/nav.tsx` — sidebar component

### Public pages
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/` — root: redirect by role

---

## 9. Library Modules (`src/lib/`)

| File | Purpose | Key exports |
|---|---|---|
| `auth.ts` | JWT signing/verifying, session cookie helpers. Lazy `getSecret()` so build doesn't fail without `JWT_SECRET`. | `signToken, verifyToken, getSession, setSessionCookie, clearSessionCookie` |
| `prisma.ts` | Prisma singleton with better-sqlite3 adapter. DB path: `process.cwd() + "/prisma/hr.db"`. | `prisma` |
| `super-admin.ts` | Email-based super-admin check. | `getSuperAdminEmails, isSuperAdminEmail, requireSuperAdmin` |
| `rate-limit.ts` | In-memory sliding-window limiter. Per-process `Map`. Auto-cleanup every 10min. | `checkRateLimit, rateLimitResponse, getIP, LIMITS` |
| `otp.ts` | In-memory 6-digit OTP store. 10-min TTL, single-use. Cleanup every 5min. | `createOtp, verifyOtp` |
| `validate.ts` | Email/phone/IBAN validation. Saudi-aware phone regex. | `isValidEmail, isValidPhone, validatePassword, isValidIBAN` |
| `file-validation.ts` | **Magic-byte signature check** for uploads. Allowlist of known signatures (JPEG/PNG/GIF/WebP/PDF/Office). Also `sanitizeFileName`. | `verifyFileSignature, sanitizeFileName` |
| `email.ts` | Nodemailer wrapper. Reads SMTP from `Setting` table per-tenant. Sends OTP, account-locked, employee-invite, password-reset, doc-expiry, etc. | `sendOtpEmail, sendAccountLockedEmail, sendEmployeeInviteEmail, sendPasswordResetEmail, sendCompanyWelcomeEmail, ...` |
| `notifications.ts` | DB notifications + per-recipient routing. | `notifyEmployee, notifyHR` |
| `push.ts` | Web Push via `web-push` lib. VAPID keys from env. Auto-removes stale subscriptions on 410/404. | `sendPushToUser, sendPushToEmployee, sendPushToHR` |
| `backup.ts` | SQLite backup: `fs.copyFileSync(prisma/hr.db, backups/backup-<isodate>.db)`. Keeps last 14. Auto-runs at boot + every `BACKUP_INTERVAL_HOURS`. | `createBackup, listBackups, deleteBackup, readBackup, startAutoBackup, stopAutoBackup` |
| `attendance-settings.ts` | Reads `attendance_settings` Setting blob with defaults. | `getAttendanceSettings` |
| `saudization.ts` | Nitaqat band table + `calculateSaudization()`. Reads `saudization_target` Setting. Bands: platinum/high_green/med_green/low_green/yellow/red. | `NITAQAT_BANDS, getBand, calculateSaudization` |
| `letters-pdf.ts` | jsPDF letter generators. Now accepts `logoDataUrl, primaryColor, commercialReg, taxNumber, companyAddress, companyPhone, companyEmail`. | `generateSalaryCertificate, generateEmploymentLetter, generateExperienceLetter` |
| `salary-pdf.ts` | jsPDF + autotable salary slip. | `generateSalarySlipPdf` |
| `export-utils.ts` | xlsx export helpers. | `exportToExcel` |
| `features.ts` (NEW) | Plan tiers + feature flag map. See §11. | `getCurrentPlan, getFeatures, hasFeature, featureGuard, features (Proxy), getPlanInfo` |
| `branding-client.ts` (NEW) | Client-side helper to fetch logo as data URL for jsPDF. | `fetchLogoDataUrl, brandingForPdf` |
| `utils.ts` | shadcn `cn()` helper. | `cn` |

---

## 10. Components

### Custom (`src/components/`)
- **`branding-provider.tsx`** (NEW) — React Context. Fetches `/api/settings/branding` on mount, stores `Branding`. Sets CSS variable `--brand-primary-custom` from `primaryColor`. Hook: `useBranding()`.
- **`lang-provider.tsx`** — AR/EN context. Persists choice in `localStorage.hr_lang`. Hook returns `{ lang, t }` where `t(key)` looks up an in-memory Arabic-keyed translation table.
- **`theme-provider.tsx`** — light/dark. Persists in `localStorage.hr_theme`. Toggling adds/removes `dark` class on `<html>`.
- **`sidebar-nav.tsx`** — HR sidebar. Uses `useBranding()` to swap Mawaridx logo for tenant logo if set. Navigation list is hardcoded.
- **`notification-bell.tsx`** — polls `/api/notifications` every 60s, shows unread count.
- **`push-notification-button.tsx`** — VAPID subscribe flow.
- **`employee-avatar.tsx`** — initials fallback if no photo.
- **`geofence-map.tsx`** — Leaflet circle for `WorkLocation.radius`.
- **`map-picker.tsx`** — Leaflet click-to-set lat/lng.
- **`mawaridx-logo.tsx`** — SVG MawaridX logo (fallback when no tenant logo).
- **`theme-lang-toggle.tsx`** — pill UI toggle.

### shadcn primitives (`src/components/ui/`)
`avatar, badge, button, card, dialog, dropdown-menu, input, label, navigation-menu, pagination, select, separator, sheet, sidebar, skeleton, table, tabs, textarea, tooltip` — generated by `shadcn` CLI. **`Button` does NOT support `asChild` prop** (the existing component is the older variant — be careful when porting examples from shadcn docs).

---

## 11. Feature Flags & Plan Tiers (`src/lib/features.ts`)

### How it works

Each tenant container has a `COMPANY_PLAN` env var (`trial / basic / growth / business / enterprise`). The library maps the plan to a typed `FeatureMap`:

```ts
type FeatureMap = {
  gpsAttendance: boolean;
  shiftScheduling: boolean;
  advancedPayroll: boolean;
  customLetters: boolean;
  performanceReviews: boolean;
  trainingTracking: boolean;
  recruitment: boolean;
  aiInsights: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  maxEmployees: number;
  maxStorageGB: number;
  backupRetentionDays: number;
};
```

Plan-feature matrix (excerpt — see file for full):

| Feature | trial | basic | growth | business | enterprise |
|---|---|---|---|---|---|
| gpsAttendance | ❌ | ❌ | ✅ | ✅ | ✅ |
| advancedPayroll | ❌ | ❌ | ✅ | ✅ | ✅ |
| customLetters | ❌ | ✅ | ✅ | ✅ | ✅ |
| customBranding | ❌ | ✅ | ✅ | ✅ | ✅ |
| recruitment | ❌ | ❌ | ✅ | ✅ | ✅ |
| aiInsights | ❌ | ❌ | ❌ | ✅ | ✅ |
| apiAccess | ❌ | ❌ | ❌ | ✅ | ✅ |
| maxEmployees | 10 | 50 | 200 | 1000 | 99999 |

### Public API

```ts
import { features, hasFeature, featureGuard, getPlanInfo } from "@/lib/features";

// In a server component or route:
if (!hasFeature("gpsAttendance")) return notFound();

// In an API route:
const r = featureGuard("customBranding");
if (r) return r;  // returns 404 with bilingual error

// In SSR / route handler:
features.gpsAttendance        // ← boolean (Proxy looks up at access time)

// To display plan info:
const { plan, label, features: f } = getPlanInfo();
```

### Adding a new feature

1. Add the flag name to `FeatureMap` type and to **every** plan in `PLAN_FEATURES`.
2. Use `features.<name>` or `hasFeature("<name>")` to gate code paths.
3. On the API side: `featureGuard("<name>")`.
4. On the UI side (client component): pass an SSR-derived flag down OR fetch it from a small `/api/features` endpoint (not yet built — see Known Issues §16).

⚠️ **There is no `/api/features` endpoint yet.** Client components currently can't read the flag. For client gating, either:
- Render the flag check on the server in the parent route segment, or
- Build a `GET /api/features` route that returns `getFeatures()`. (Trivial — recommended next step.)

---

## 12. Branding System

### Storage
- DB row: `Setting` where `key = "branding"`, `value = JSON.stringify({ displayName, logoUrl, primaryColor, commercialReg, taxNumber, address, phone, email })`.
- Logo file: `/uploads/branding/logo-<ts>-<hex>.{png|jpg|webp|svg}`, served by Next.js static handler.

### API
- `GET  /api/settings/branding` — public (any session). Returns merged with DEFAULTs.
- `POST /api/settings/branding` — `["hr", "admin"]` only. Validates hex color regex.
- `POST /api/settings/branding/logo` — multipart `file`. Allowed: PNG/JPEG/WebP/SVG. Max 2 MB. Magic-byte verified for raster; SVG is text-checked for `<script>` injection. Old logo deleted on replace.
- `DELETE /api/settings/branding/logo` — removes file + nulls `logoUrl`.

Both POST routes guard on `hasFeature("customBranding")`.

### Client integration
- `BrandingProvider` (root layout) → `useBranding()` everywhere.
- `SidebarNav` shows logo + display name if set.
- For PDFs: `await brandingForPdf(branding)` → spread into `LetterData`. `letters-pdf.ts` paints the logo at `(8,4,20,20)` and uses `primaryColor` for the header bar / accent. **jsPDF does NOT render SVG via `addImage` — `fetchLogoDataUrl` returns `undefined` for SVG, so PDF falls back to text-only header.** Keep PNG/JPEG for PDFs.

### Footer
The PDF footer pulls CR/VAT/phone/email and renders them as a centered single line, with address on a second line. If none present → falls back to "Generated by MawaridX HR System".

---

## 13. Security Posture

| Concern | Mitigation |
|---|---|
| Brute force login | IP rate limit (5/15min, 30min block) + account lockout (5 attempts → 15min lock) + email alert to user |
| User enumeration | Always-run bcrypt compare on missing user |
| Password storage | bcrypt cost 12 |
| Session theft | httpOnly + secure (prod) + sameSite:strict cookie. JWT 24h. |
| Super-admin compromise | OTP 2FA via email (10min single-use) — toggleable via `BYPASS_2FA` for demo |
| File upload abuse | Magic-byte signature check, size cap, sanitized filename, served from `/uploads/...` (no script execution path) |
| Path traversal | All file APIs validate the requested name against a strict regex before `fs` ops |
| CSRF | sameSite:strict cookie + same-origin policy in CSP |
| XSS | CSP with `frame-ancestors 'none'`, `object-src 'none'`, no `unsafe-eval` in prod, `X-XSS-Protection`, `X-Content-Type-Options: nosniff`. SVG uploads scrub `<script>`. |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| Audit | `AuditLog` rows on every login attempt, lock, OTP issue, state change |
| Backup | Auto every N hours (default 24), 14 retained, includes boot-time snapshot |
| Env validation | `instrumentation.ts` throws if `JWT_SECRET` missing or <32 chars in production |
| Rate limit on registration | 5/15min per IP |

---

## 14. Deployment

### Dockerfile (3-stage)

```
deps     → node:20-alpine + apk(libc6-compat openssl python3 make g++)
         → COPY package*.json + COPY prisma/   (REQUIRED — see incident)
         → npm ci --no-audit --no-fund
         → npx prisma generate                  (produces node_modules/.prisma)

builder  → reuses deps' node_modules
         → COPY .
         → npm run build                        (Next.js standalone)

runner   → node:20-alpine
         → addgroup nodejs:1001 + adduser nextjs:1001
         → COPY .next/standalone, .next/static, public, prisma, node_modules subset, src/generated
         → COPY docker-entrypoint.sh
         → mkdir -p /app/{prisma,backups,public/uploads} + chown nextjs
         → USER nextjs
         → EXPOSE 3000
         → ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
         → CMD ["node", "server.js"]
```

**Why prisma generate is in `deps` stage**: previously it ran in `builder`, but a stale lookup tried to `COPY --from=... node_modules/.prisma` which didn't exist. Generating it in deps means that directory exists for both builder and runner copy steps.

### docker-entrypoint.sh

```sh
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
  || node ./node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --skip-generate
exec "$@"
```

The fallback to `db push` exists for first-run scenarios when the volume is empty.

### docker-compose.yml shape

```yaml
services:
  hr-company-a:
    image: mawaridx-app:latest
    build: { context: ., dockerfile: Dockerfile }   # ← ONLY service that builds
    environment: ...
    volumes: [ company-a-db:/app/prisma, company-a-uploads:/app/public/uploads, company-a-backups:/app/backups ]

  hr-company-b:
    image: mawaridx-app:latest                     # ← reuses the tag above
    depends_on: [ hr-company-a ]
    environment: ...
    volumes: [ company-b-* ]

  hr-company-c:
    image: mawaridx-app:latest
    depends_on: [ hr-company-a ]
    environment: ...
    volumes: [ company-c-* ]

  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    volumes: [ ./nginx.conf:/etc/nginx/nginx.conf:ro, ./ssl:/etc/nginx/ssl:ro, certbot-www:/var/www/certbot:ro ]
    depends_on: [ hr-company-a, hr-company-b, hr-company-c ]
```

**Shared anchors** at top of file:
- `x-app-env` — common env vars (NODE_ENV, JWT_SECRET, etc.)
- `x-healthcheck` — `wget --spider http://127.0.0.1:3000/`

⚠️ **Only one service may have `build:`.** Building three identical
images in parallel OOM'd a KVM 2 (8 GB). Tenants B and C reuse the
locally-tagged `mawaridx-app:latest` image. **Do NOT add `build:` to
B or C.**

### nginx.conf

- Runs on 80 (and 443 block is commented until certbot is wired).
- `map $host $tenant_upstream` decides upstream by Host header.
- Forwards real IP / proto / host to upstream.
- Body size 50 MB, gzip, websocket upgrade map.
- Let's Encrypt ACME challenge directory: `/var/www/certbot`.

### Volume layout (per tenant)

```
company-X-db       → /app/prisma         (BUT see Known Issue §16!)
company-X-uploads  → /app/public/uploads
company-X-backups  → /app/backups
```

### Hostinger walkthrough

See `README-DEPLOY.md` (already in repo). Key UI flow:
1. Docker Manager → Create from Compose URL (GitHub) → branch `main`
2. Set env vars in the UI (one column on the right)
3. Build & Start
4. First boot runs `prisma migrate deploy`; falls back to `db push`
5. Nginx becomes healthy → app is live on HTTP

For SSL, use certbot in standalone mode against the `nginx` container,
write certs to `./ssl/`, then uncomment the 443 server block.

---

## 15. Environment Variables

Required (will fail-fast at boot if missing):
- `JWT_SECRET` — ≥32 chars. Generate via `openssl rand -base64 64`.

Strongly recommended:
- `SUPER_ADMIN_EMAILS` — comma-sep, lowercased internally.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_EMAIL` — without these push silently no-ops.

Per tenant (set by docker-compose anchors / per-service):
- `COMPANY_NAME` — display name (overridden by Branding UI if set in DB)
- `COMPANY_PLAN` — `trial|basic|growth|business|enterprise`
- `NEXT_PUBLIC_APP_URL` — public URL for that tenant
- `TENANT_ID` — `company-a|company-b|company-c` (currently informational; not used in code yet — wire up if you need per-tenant logging)

Optional:
- `BACKUP_INTERVAL_HOURS` — default 24
- `BYPASS_2FA` — `"true"` disables OTP for super-admin (demo only)
- `DATABASE_URL` — fixed at `file:./prisma/hr.db` (don't change — `lib/prisma.ts` derives the path from `process.cwd()`)

---

## 16. Known Issues / Pending Work

Ordered by priority.

### 🔴 P0 — Schema-in-volume problem
The volume `company-X-db:/app/prisma` masks the entire `/app/prisma`
directory. On **first run**, Docker initializes the volume from the
image's directory contents (so `schema.prisma` and `migrations/` end
up in the volume — first deploy works). On **subsequent deploys**,
the volume keeps the old `schema.prisma` and `prisma migrate deploy`
runs against the stale schema. Schema upgrades are silently broken.

**Fix**: split the DB out of `/app/prisma`. Two options:
- (preferred) Change `DATABASE_URL` to `file:./data/hr.db`, mount
  `company-X-db:/app/data`, leave `/app/prisma` in the image.
- Keep the path; mount only the DB file, not the directory.

### 🔴 P0 — No initial admin / bootstrap UX
On a brand-new deployment the DB has zero users. Anyone can hit
`/register` and create a `role: "employee"` account. If their email
matches `SUPER_ADMIN_EMAILS`, they become super admin via the email
check, but their `User.role` stays `"employee"` — so the proxy
forwards them to `/portal` instead of `/dashboard` for any HR pages.

**Fix**: in `POST /api/auth/register`, if `isSuperAdminEmail(email)`
and there are zero users in the DB, create with `role: "admin"`
instead of `"employee"`. Or add a one-time seed script invoked from
`docker-entrypoint.sh`.

### 🟡 P1 — JWT_SECRET shared across tenants
See §4. Easy fix: per-tenant secret in compose (`COMPANY_A_JWT_SECRET`
etc.).

### 🟡 P1 — `/api/features` endpoint missing
Client components can't read feature flags. Add a small route:
```ts
// src/app/api/features/route.ts
import { NextResponse } from "next/server";
import { getFeatures, getCurrentPlan } from "@/lib/features";
export async function GET() {
  return NextResponse.json({ plan: getCurrentPlan(), features: getFeatures() });
}
```
Then expose it via a `useFeatures()` hook similar to `useBranding`.

### 🟡 P1 — `requests/[id]` trusts `body.role`
The approve/reject handler reads `role` from the request body, not the
session. A logged-in employee could craft a request with `role: "hr"`.
Guard: derive the role server-side from `session.role` (or
`session.role === "manager"` vs `"hr"|"admin"`). Currently the only
mitigation is that the manager/HR pages send the correct role; an
attacker could bypass it via direct API calls.

### 🟢 P2 — `DATABASE_URL` env not actually consumed
`prisma.ts` ignores `DATABASE_URL` and derives the path from
`process.cwd()`. The env var exists for documentation parity with
Prisma defaults but is functionally dead. Either honor it or drop it
from `.env.example`.

### 🟢 P2 — `Button` component lacks `asChild`
`src/components/ui/button.tsx` is the older shadcn variant without
Radix Slot. Recipes from shadcn docs that use `<Button asChild>` will
fail typecheck. Either upgrade `Button` to use `Slot`, or wrap with
plain `<label>`/`<a>` and style manually (current approach).

### 🟢 P3 — Dual auth stacks
`next-auth@5-beta` and `@auth/prisma-adapter` are installed but the
app actually authenticates via custom JWT in `lib/auth.ts`. Either
finish migrating to next-auth or remove the unused deps. Until then,
**don't bump nodemailer past 7.x** — next-auth peer-deps lock it.

---

## 17. Coding Conventions

### File naming
- React components: `kebab-case.tsx` (`sidebar-nav.tsx`, not `SidebarNav.tsx`)
- Library modules: `kebab-case.ts`
- Route handlers: `route.ts` (Next.js convention)
- Pages: `page.tsx` (Next.js convention)

### Imports
```ts
// External first
import { NextResponse } from "next/server";
// Internal via @/...
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
```

### API route handler skeleton
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["hr", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const body = await req.json();
    // ... validate body ...
    const created = await prisma.X.create({ data: body });
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
```

### Dynamic route params
```ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // ← await is REQUIRED in Next 16
  ...
}
```

### Page (server component)
```ts
// app/(main)/foo/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function FooPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // ...
}
```

### Client component
```ts
"use client";
import { useEffect, useState } from "react";
// Browser fetch:
const r = await fetch("/api/foo");
const data = await r.json();
```

### Error messages
- All user-facing errors are **Arabic**. Examples: `"غير مصرح"`,
  `"البريد الإلكتروني أو كلمة المرور غير صحيحة"`,
  `"حدث خطأ"`. Keep them Arabic.

### Translation
- `useLang()` → `{ lang, t }`. `t("Arabic key")` returns the same
  string for `ar`, the English equivalent (if defined) for `en`.
  Coverage is **incomplete** — many strings are inline Arabic only.

### Comments
- Bilingual comments are common (`// تشغيل فقط في Node.js runtime`).
  Keep this style for consistency.
- Section dividers use Unicode box drawing:
  `// ──────────────────────────────────────────────────────────`

### CSS / styling
- Tailwind utilities. No CSS modules.
- Custom theme tokens in `app/brand-theme.css`:
  - `bg-brand-canvas`, `text-brand-ink`, `border-brand-border`
  - `bg-brand-gradient`, `text-brand-primary`, `bg-brand-primary-soft`
  - `glass-strong`, `mesh-bg`, `pattern-islamic`, `pattern-dots`
- RTL support is automatic via `<html dir="rtl">` (Arabic only). Use
  `mr-N` / `ml-N` Tailwind classes — they swap automatically when
  `dir` changes (Tailwind 4 logical properties).
- Typography: Geist (Latin) + IBM Plex Sans Arabic, loaded via
  `next/font/google` in `app/layout.tsx`.

---

## 18. Build & Local Dev

### Local dev
```bash
npm install               # may need: --legacy-peer-deps if next-auth peers complain
npx prisma generate
npx prisma migrate dev    # creates prisma/hr.db
npm run dev               # http://localhost:3000 (binds 0.0.0.0)
```

`next dev` runs with `-H 0.0.0.0` (see package.json `scripts.dev`).
`allowedDevOrigins` in `next.config.ts` whitelists `*.trycloudflare.com`
for tunnels.

### Production build (locally — to verify before push)
```bash
npm run build
```

Common breakages to watch for:
1. **Type errors**: build runs `tsc` after Turbopack compile. Fix
   types before commit. Examples we've hit:
   - `Buffer` not assignable to `BodyInit` → wrap with `new Uint8Array(buf)`
   - `string | null` not assignable to `string` → null-check at boundary
2. **Module-load throws**: If a module throws at import time, the
   "Collecting page data" phase fails. Make env validation lazy
   (function calls), never at top level.
3. **Edge runtime warnings**: `process.exit()` triggers warnings even
   in nodejs-runtime files. Use `throw new Error(...)`.

### CI/CD
None configured. Hostinger Docker Manager pulls from `main` on
manual trigger.

---

## 19. How To: Common Recipes

### Add a new API route
1. Create `src/app/api/<resource>/route.ts`
2. Use the skeleton in §17.
3. If it touches new tables → migrate (`npx prisma migrate dev`).
4. If it's gated by a plan → `featureGuard("xxx")`.
5. If it accepts files → use `verifyFileSignature`, `sanitizeFileName`, and a per-resource directory under `public/uploads/`.

### Add a new HR page
1. Create `src/app/(main)/<page>/page.tsx`.
2. Add to `src/components/sidebar-nav.tsx` `navItems` with a `lucide-react` icon.
3. If it requires HR-only access AND it's a static path, add to `HR_ONLY_PATHS` in `src/proxy.ts`.

### Add a feature flag
1. Edit `src/lib/features.ts`:
   - Add to `FeatureMap` type
   - Add a value in **every** plan in `PLAN_FEATURES`
2. Use `features.<name>` server-side OR `featureGuard("<name>")` in API.
3. For client-side: build `/api/features` first (see §16) and a `useFeatures` hook.

### Add a Prisma migration
1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name describe_change` — creates SQL + regenerates client.
3. Commit both `schema.prisma` and the new `migrations/<ts>_<name>/` directory.
4. On deploy: `docker-entrypoint.sh` runs `migrate deploy` automatically.

### Add a new tenant container (e.g., `hr-company-d`)
1. In `docker-compose.yml`, copy the `hr-company-c` block, rename to `d`. Use `image: mawaridx-app:latest` (no `build:`). Add `depends_on: [hr-company-a]`.
2. Add `company-d-db`, `company-d-uploads`, `company-d-backups` named volumes.
3. In `nginx.conf` `map $host $tenant_upstream`, add `company-d.<domain> "hr-company-d:3000";`.
4. Add `nginx.depends_on: [hr-company-d]`.
5. Add env vars: `COMPANY_D_NAME`, `COMPANY_D_PLAN`, `COMPANY_D_URL` to `.env`.
6. Redeploy.

### Generate a PDF letter with branding
```ts
"use client";
import { useBranding } from "@/components/branding-provider";
import { brandingForPdf } from "@/lib/branding-client";
import { generateSalaryCertificate } from "@/lib/letters-pdf";

const { branding } = useBranding();
const brand = await brandingForPdf(branding);
generateSalaryCertificate({
  employeeName: "...",
  employeeNumber: "...",
  basicSalary: 5000,
  ...brand,                    // logoDataUrl, primaryColor, companyName, CR, VAT, address, phone, email
});
```

### Add a new role-gated route
- Edit `src/proxy.ts`:
  - For HR-only pages → add to `HR_ONLY_PATHS`
  - For employee-only pages → add to `EMPLOYEE_PATHS`
- For super-admin → use `requireSuperAdmin()` in the route handler (proxy doesn't check super-admin pages — they self-guard via SSR layout).

### Disable 2FA temporarily (demo)
Set env `BYPASS_2FA=true`. Login route skips the OTP branch.

### Reset a locked account (admin)
There is no UI for this. Two options:
- Wait 15 minutes
- `UPDATE User SET failedLoginAttempts=0, lockedUntil=NULL WHERE email='...'` against the SQLite file inside the volume

---

## 20. Quick-Reference: Critical Files

If you can only read 10 files, read these:

1. `prisma/schema.prisma` — all data shapes
2. `src/proxy.ts` — auth gate for every request
3. `src/lib/auth.ts` — JWT mechanics
4. `src/lib/super-admin.ts` — owner-vs-tenant boundary
5. `src/lib/prisma.ts` — DB client wiring
6. `src/lib/features.ts` — plan tier system
7. `src/instrumentation.ts` — boot-time env validation + backup scheduling
8. `src/app/api/auth/login/route.ts` — auth flow with all edge cases
9. `Dockerfile` — build pipeline (note: prisma generate is in **deps** stage)
10. `docker-compose.yml` — multi-tenant topology

After those, browse `src/app/api/employees/route.ts` and
`src/app/(main)/dashboard/page.tsx` for an end-to-end example of
how a feature is structured.

---

## 21. Communication Style with the Owner

The owner is **Saudi, Arabic-first**, communicates in Arabic, prefers:
- Short, action-oriented replies (avoid long pre-amble).
- Tables for trade-off comparisons.
- Concrete, copy-pasteable code over abstract explanation.
- Verifying claims by reading code rather than assuming.
- When something is broken, **fix it and report**, don't just analyze.

The owner does NOT want:
- Documentation files generated unprompted (this `HANDOFF.md` was
  explicitly requested — others probably aren't).
- Unsolicited refactors of working code.
- Adding features without asking.
- English replies (use Arabic by default).

When making a change that affects deployment (Dockerfile, compose,
env), surface the risk and ask before applying — except when the
owner has explicitly said "go ahead and fix it".

---

## 22. Where to Pick Up

Last work session ended with:
- `583aabc fix(docker): generate prisma in deps stage + share image across tenants`

The owner expects this to make the Hostinger deploy succeed. Next
likely tasks:
1. Verify Hostinger build passes; if not, debug from logs.
2. Address P0 issues from §16 (volume layout + initial admin bootstrap).
3. Apply branding to the documents page (`(main)/company-docs/page.tsx`)
   per the owner's earlier request. Suggested approach was outlined in
   the chat but not yet implemented — use `useBranding()` for logo on
   the page header, watermark on trial plans, gate uploads by
   `features.maxStorageGB`, and call `brandingForPdf(branding)` before
   generating any document PDFs.
4. Consider adding `/api/features` endpoint + `useFeatures()` hook
   so client components can branch on plan tier.

Good luck. The owner is hands-on and will tell you when something is
wrong — but they're also patient with reasoned trade-off explanations.
