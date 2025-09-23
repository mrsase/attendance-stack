import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';

export default async function DashboardHome() {
  const me = await requireUser();
  const isOrgAdmin = hasAnyRole(me, [ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN]);
  const canTeam =
    !!me.departmentId &&
    hasAnyRole(me, [ROLE.DIRECTOR, ROLE.MANAGER, ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN], me.departmentId);

  return (
    <>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Quick links tailored to your role. Use the sidebar to explore everything.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Punch" desc="Clock in/out and view today's punches." href="/me/attendance" emoji="⏱️" />
        <Card title="My leave" desc="Request hourly/daily leave and see history." href="/me/leave" emoji="🛫" />
        <Card title="My timesheet" desc="Expected vs actual per day with sessions." href="/me/timesheet" emoji="📊" />

        {canTeam && (
          <>
            <Card title="Team approvals" desc="Approve or reject leave requests." href="/dept/approvals" emoji="✅" />
            <Card title="Team corrections" desc="Review punch corrections for your team." href="/dept/approvals/corrections" emoji="🧾" />
            <Card title="Team timesheets" desc="Range-based totals and breakdowns." href="/dept/timesheets" emoji="👥" />
          </>
        )}

        {isOrgAdmin && (
          <>
            <Card title="Company approvals" desc="Org-wide leave approvals." href="/admin/approvals" emoji="🗂️" />
            <Card title="Corrections (org)" desc="Org-wide correction approvals." href="/admin/approvals/corrections" emoji="🧾" />
            <Card title="Company timesheets" desc="Department/user filters + CSV." href="/admin/timesheets" emoji="🏢" />
            <Card title="Calendars" desc="Work calendars, rules & holidays." href="/admin/calendars" emoji="📆" />
            <Card title="Sites" desc="Manage geofences and Wi-Fi lists." href="/admin/sites" emoji="📍" />
          </>
        )}
      </div>
    </>
  );
}

function Card({ title, desc, href, emoji }: { title: string; desc: string; href: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
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
