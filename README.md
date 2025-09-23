# Attendance Stack

A modern, IRL-friendly **Attendance & Leave Management** system built as a Turborepo monorepo.
It supports **punch in/out**, **geofencing (Wi-Fi → GPS fallback)**, **work calendars**, **org holidays**, **leave requests & approvals**, **attendance correction workflow**, and the first cut of **timesheets** (expected vs actual).

English/LTR UI. Designed to operate on **Jalali/Shamsi calendars** (holidays + labels stored now; full converters later).

---

## ✨ Features (current)

* **Authentication & RBAC**

  * Email/password sessions, httpOnly cookies.
  * Roles: `SUPER_ADMIN`, `IT_MANAGER`, `HR_MANAGER`, `DIRECTOR`, `MANAGER`, `EMPLOYEE`, `CEO`.
  * Route-level protection and role-based navigation.

* **Attendance (Punch)**

  * Clock in/out with **Wi-Fi BSSID/SSID allow-list** first, **GPS radius** fallback.
  * Captures IP + geofence verdict + notes.
  * Server-time authoritative; simple double-punch throttling.

* **Work Sites (Geo)**

  * Per-org **WorkSite** (lat/lng, radius meters, Wi-Fi SSIDs).
  * Admin pages to create/edit/delete.

* **Calendars & Holidays**

  * **WorkCalendar** per org; **weekday rules** with start/end minutes and weekend/off days.
  * **Guarded delete** (blocked if calendar is assigned).
  * **Holidays** (org-wide), stored as **UTC midnight** with optional **Jalali label**.
  * Admin pages: list, details, edit (rules), holidays CRUD.

* **Leave Workflow**

  * **Submit** leave: `DAILY` or `HOURLY`, date/time window, reason.
  * **Queues**:

    * Team (Manager/Director for requester’s department)
    * Company (HR/IT/Admin)
  * Approve/Reject with optional note; approver & decision audit fields.

* **Attendance Corrections**

  * Correction requests: **ADD / UPDATE / DELETE** a punch.
  * Same approvals pattern (team/company).
  * On approval, the system **applies** the change to `AttendanceEvent`.

* **Timesheets (foundation)**

  * Per-day **expected minutes** (from calendar; subtract approved leave; zero on holidays/weekends).
  * Per-day **actual minutes** (pair in/out; clip at day bounds).
  * **My Timesheet** UI: daily table + sessions and totals.

---

## 🧭 Roadmap (near-term)

* **Manager/HR timesheets** (team/company filters + CSV export).
* **Anomalies**: late start, early leave, missing punches, overtime.
* **Jalali integration**: lightweight converter for inputs and display.
* **Mobile (Expo) app**: BSSID capture (Android), GPS fallback, offline queued punches.
* **RBAC Admin UI**: assign roles, designate Directors/Managers per department.
* **Security polish**: rate limiting, idempotency keys for punch, stronger password policy.
* **Analytics dashboards**: under/overwork %, utilization, compliance heatmaps.

---

## 🏗 Architecture

* **Monorepo** with \[Turborepo] + pnpm workspaces.
* **Web app**: Next.js (App Router), Tailwind CSS, Server Actions & Route Handlers.
* **DB**: PostgreSQL with Prisma.
* **Packages**:

  * `@repo/db` (schema, migrations, Prisma client)
  * `@repo/typescript-config` (base tsconfig)
  * (optionally) shared UI/util packages as we grow

### Directory Layout

```
attendance-stack/
├─ apps/
│  └─ web/                 # Next.js app (dashboard + APIs)
│     ├─ app/              # App Router routes
│     ├─ components/
│     ├─ lib/              # auth, rbac, time/timesheet utils
│     ├─ scripts/seed.ts   # seed data
│     ├─ prisma/           # (if app runs generate separately)
│     └─ ...
├─ packages/
│  ├─ db/
│  │  ├─ prisma/schema.prisma
│  │  └─ src/index.ts      # exports PrismaClient singleton
│  └─ typescript-config/
│     └─ base.json
├─ turbo.json
├─ package.json
└─ pnpm-workspace.yaml
```

---

## 🧮 Data Model (high level)

* **Organization** → Departments, Users, WorkSites, WorkCalendars, Holidays
* **User** ↔ RoleAssignments (scoped to dept optional)
* **AttendanceEvent** (IN/OUT, time, source, geo info)
* **LeaveRequest** (type, window, status, approver, dept snapshot)
* **AttendanceCorrection** (ADD/UPDATE/DELETE proposals + approval)
* **WorkCalendar / CalendarRule / CalendarAssignment**
* **Holiday** (UTC midnight per local day, Jalali label)
* **Session** (runtime pairing, not persisted yet)

> See `packages/db/prisma/schema.prisma` for the authoritative schema.

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+ (LTS recommended)
* pnpm 9+
* PostgreSQL 14+ (local or hosted)

### 1) Clone & Install

```bash
git clone <your-fork-url> attendance-stack
cd attendance-stack
pnpm install
```

### 2) Environment Variables

Create a root `.env` (used by Prisma and shared code):

```
# PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attendance_stack?schema=public"

# Auth
AUTH_COOKIE_NAME="attendance_session"
AUTH_COOKIE_SECRET="a-very-long-random-string"

# App
NODE_ENV="development"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

> If you keep env vars per-app, duplicate relevant ones into `apps/web/.env.local`.

### 3) Database

**Option A: Docker Postgres**

```bash
docker run --name attendance-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=attendance_stack -p 5432:5432 -d postgres:15
```

**Migrate & Generate:**

```bash
# generate prisma client in the shared package
pnpm -F @repo/db prisma migrate dev --name init
pnpm -F @repo/db prisma generate

# (optional) if web also runs generate:
pnpm --filter web run prisma:generate
```

**Seed (dev fixtures):**

```bash
pnpm --filter web run seed
# runs: tsx scripts/seed.ts (make sure DATABASE_URL is set)
```

### 4) Tailwind (web)

Installed and configured in `apps/web`:

* `tailwind.config.ts` with Next + app directory content paths
* `postcss.config.js`
* `app/globals.css` imports Tailwind base/components/utilities

### 5) Dev server

```bash
# Start everything (web is persistent, db is external)
pnpm dev
# or only web
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000)

> Default seed credentials (if you kept the example):
> `it@example.com` / `password` (IT\_MANAGER / SUPER\_ADMIN)
> `hr@example.com` / `password` (HR\_MANAGER)
> `manager@example.com` / `password` (MANAGER)
> `employee@example.com` / `password` (EMPLOYEE)

---

## 🧩 RBAC (at a glance)

* **Admin suite**: `SUPER_ADMIN`, `IT_MANAGER`, `HR_MANAGER`

  * Calendars/Holidays CRUD
  * Company approvals (leave, corrections)
  * Site management

* **Department leadership**: `DIRECTOR`, `MANAGER`

  * Team approvals (leave, corrections) **restricted to their department**

* **Employees**

  * Punch in/out, view today
  * Request leave; submit corrections
  * View own timesheet

---

## 🛠 API Surface (implemented)

> All endpoints are **Next.js Route Handlers** (under `apps/web/app/api/**`).

### Attendance

* `POST /api/attendance/punch` → clock in/out with geo/Wi-Fi metadata
* `GET  /api/attendance/today` → today’s events + status
* `GET  /api/attendance/recent?days=14` → recent events (self)

### Work Sites

* `GET/POST /api/sites` (admin)
* `PATCH/DELETE /api/sites/[id]` (admin)

### Calendars & Holidays

* `GET/POST /api/calendars` (admin)
* `PATCH/DELETE /api/calendars/[id]` (guarded delete)
* `GET/POST /api/holidays` (admin)
* `DELETE /api/holidays/[id]` (admin)

### Leave

* `POST /api/leave` → submit
* `GET  /api/leave/mine` → my history
* `GET  /api/approvals/leave?scope=team|company`
* `POST /api/leave/[id]/decision` → approve/reject

### Attendance Corrections

* `POST /api/corrections` → submit (ADD/UPDATE/DELETE)
* `GET  /api/corrections/mine` → my corrections
* `GET  /api/approvals/corrections?scope=team|company`
* `POST /api/corrections/[id]/decision` → approve/reject (applies change)

### Timesheets

* `GET /api/timesheets/me?from=YYYY-MM-DD&to=YYYY-MM-DD`

  * Returns per-day expected/actual minutes + paired sessions.
  * Day boundary currently tuned for `Asia/Tehran`; generalized TZ coming.

---

## 🖥 UI Pages (high level)

* `/login` – email/password
* `/dashboard` – overview (role-aware)
* **Attendance**

  * `/me/attendance` – punch + today view
* **Leave**

  * `/me/leave` – submit + my requests
  * `/dept/approvals` – team leave approvals
  * `/admin/approvals` – company leave approvals
* **Corrections**

  * `/me/corrections` – submit + my corrections
  * `/dept/approvals/corrections` – team corrections approvals
  * `/admin/approvals/corrections` – company corrections approvals
* **Calendars**

  * `/admin/calendars` – list/create
  * `/admin/calendars/[id]` – details
  * `/admin/calendars/[id]/edit` – edit rules & holidays
* **Sites**

  * `/admin/sites` – list/create/edit

> The left navigation is role-based; users only see what they can access.

---

## 🧰 Developer Workflow

Common commands:

```bash
# run all dev servers (no cache)
pnpm dev

# build all
pnpm build

# typecheck all
pnpm run check-types

# lint all
pnpm lint

# prisma (shared package)
pnpm -F @repo/db prisma migrate dev --name <msg>
pnpm -F @repo/db prisma generate

# seed dev data (web app script)
pnpm --filter web run seed
```

Use Turborepo filters:

```bash
pnpm --filter web dev
pnpm --filter @repo/db run <script>
```

---

## 🔐 Security Notes (dev)

* Cookies are httpOnly/secure in production; set `AUTH_COOKIE_SECRET` to a strong value.
* APIs assume same-origin fetches; consider **Origin**/**Referer** checks and/or CSRF tokens if you expose cross-site.
* Add **rate limiting** to public endpoints (login/punch).
* Store GPS decimals as **strings** (or `Prisma.Decimal`) to avoid precision drift.

---

## 🌏 Jalali / Shamsi

* Holidays can be tagged `isJalali` + `jalaliDate` (the Jalali source string).
* We store **UTC midnight** for the *local* holiday day to keep queries simple.
* A small **Jalali⇄Gregorian** helper is planned to accept Jalali inputs on forms and display both.

---

## 🚢 Deploy

* **Web**: Vercel or any Node host (Next.js App Router).
* **DB**: Neon/Supabase/Railway/Render (PostgreSQL).
* Ensure env vars (`DATABASE_URL`, `AUTH_COOKIE_*`, `NEXT_PUBLIC_BASE_URL`) are set in the hosting provider.
* Run migrations on deploy: `pnpm -F @repo/db prisma migrate deploy`.

---

## 🤝 Contributing

1. Fork & branch (`feat/<something>`)
2. Keep PRs **small & focused** (single feature/bugfix)
3. Include a **migration** when schema changes
4. Add a **commit message** that explains intent (we’ve been following `feat/fix/chore`)

---

## 📄 License

Proprietary (for now). Discuss before redistribution or commercial use.

---

## 💬 Questions / Next steps

* Want **manager/company timesheets** and **CSV export** next?
* Or **mobile punch** with **BSSID** and offline queue?
* Or **Jalali inputs** across forms?

Open an issue with “next: \<topic>” and we’ll prioritize.
