import Link from "next/link";
import type { Route } from "next";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <section className="container mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            Attendance • Leave • Calendars • Timesheets
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Attendance Stack
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            A modern, role-aware Attendance &amp; Leave Management platform for
            growing teams. Punch in/out with Wi-Fi geofencing and GPS fallback, set
            per-user working calendars, manage holidays, approve leave &amp; punch
            corrections, and track expected vs. actual time—built with Next.js,
            Prisma, and Tailwind.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={"/login" as Route}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black"
            >
              Sign in
            </Link>
            <Link
              href={"/dashboard" as Route}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
            >
              Go to dashboard
            </Link>
            <a
              href="https://github.com/your-org/attendance-stack#readme"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
            >
              <span>Read the docs</span>
              <span aria-hidden>↗</span>
            </a>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            English/LTR UI • Jalali/Shamsi friendly (holidays &amp; labels) •
            Asia/Tehran time smartness
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="container mx-auto max-w-6xl px-6 pb-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Smart Punch"
            desc="Clock in/out with Wi-Fi BSSID allow-list first, GPS radius fallback, IP capture, and geofence verdict."
            emoji="⏱️"
            href={"/me/attendance" as Route}
          />
          <Feature
            title="Calendars & Holidays"
            desc="Per-org working calendars with weekday rules and org holidays (Jalali label support). Guarded delete."
            emoji="📆"
            href={"/admin/calendars" as Route}
          />
          <Feature
            title="Leave Approvals"
            desc="Submit hourly/daily leave. Team queue for Managers/Directors, company queue for HR/IT/Admin."
            emoji="✅"
            href={"/me/leave" as Route}
          />
          <Feature
            title="Corrections Workflow"
            desc="ADD / UPDATE / DELETE punches with approval. Approved changes auto-apply to attendance."
            emoji="📝"
            href={"/me/corrections" as Route}
          />
          <Feature
            title="Timesheets"
            desc="Daily expected vs actual from your calendar. Pairs IN/OUT and clips at day bounds."
            emoji="📊"
            href={"/me/timesheet" as Route}
          />
          <Feature
            title="RBAC & Security"
            desc="Roles for Super Admin, IT, HR, Director, Manager, Employee. Route-level protection and audits."
            emoji="🔐"
            href={"/dashboard" as Route}
          />
        </div>
      </section>

      {/* Quick start / tech */}
      <section className="container mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Quick start (dev)
            </h2>
            <ol className="mt-3 list-inside list-decimal text-sm text-slate-700">
              <li>Set <code className="rounded bg-slate-50 px-1">DATABASE_URL</code> and auth envs in <code className="rounded bg-slate-50 px-1">.env</code>.</li>
              <li>Run migrations: <code className="rounded bg-slate-50 px-1">pnpm -F @repo/db prisma migrate dev</code></li>
              <li>Seed dev data: <code className="rounded bg-slate-50 px-1">pnpm --filter web run seed</code></li>
              <li>Start the app: <code className="rounded bg-slate-50 px-1">pnpm --filter web dev</code></li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Default roles &amp; sample users are created by the seed script.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Tech stack
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700 sm:grid-cols-3">
              <li>Next.js (App Router)</li>
              <li>TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Prisma + PostgreSQL</li>
              <li>Turborepo + pnpm</li>
              <li>Expo (mobile soon)</li>
            </ul>
            <div className="mt-4 rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 text-xs text-slate-600">
              Built for real-world office structures: Departments → Director/Manager,
              HR Manager, CEO, IT (Super Admin). English/LTR UI with Jalali-aware
              data.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Attendance Stack</span>
          <div className="flex items-center gap-4">
            <Link href={"/login" as Route} className="hover:text-slate-700">
              Sign in
            </Link>
            <Link href={"/dashboard" as Route} className="hover:text-slate-700">
              Dashboard
            </Link>
            <a
              href="https://github.com/your-org/attendance-stack#readme"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-700"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  title,
  desc,
  emoji,
  href,
}: {
  title: string;
  desc: string;
  emoji: string;
  href: Route;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
    >
      <div className="absolute -right-6 -top-6 aspect-square w-24 rounded-full bg-slate-100 transition-transform group-hover:scale-110" />
      <div>
        <div className="mb-2 inline-flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
      </div>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-slate-900">
        Open <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
