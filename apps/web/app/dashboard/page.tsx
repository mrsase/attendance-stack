// apps/web/app/dashboard/page.tsx
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { hasAnyRole, ROLE } from '@/lib/rbac';

function RoleBadge({ r }: { r: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
      {r}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/(auth)/login');

  const roles = user.roles?.map((rr) => String(rr.role)) ?? [];
  const canCompanyAdmin = hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);
  const canDeptManage = hasAnyRole(user, [ROLE.DIRECTOR, ROLE.MANAGER], user.departmentId ?? undefined);

  return (
    <main className="min-h-dvh bg-[radial-gradient(80rem_80rem_at_120%_-10%,rgba(59,130,246,.12),transparent_60%),radial-gradient(50rem_50rem_at_-10%_120%,rgba(236,72,153,.1),transparent_60%)]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-fuchsia-500 p-[2px]">
              <div className="h-full w-full rounded-[10px] bg-white" />
            </div>
            <span className="text-sm font-semibold">Attendance Suite</span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white transition hover:bg-black">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        {/* Greeting */}
        <section className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
          <p className="text-sm text-gray-600">{user.email}</p>
        </section>

        {/* Overview grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Profile card */}
          <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-fuchsia-500 text-white">
                <span className="text-base font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-600">{user.department?.name ?? 'No department'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.length ? (
                roles.map((r) => <RoleBadge key={r} r={r} />)
              ) : (
                <span className="text-xs text-gray-500">No roles</span>
              )}
            </div>
          </div>

          {/* Quick actions — role aware */}
          <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-3 text-sm font-semibold">Quick actions</h2>

            {/* Company-level actions */}
            {canCompanyAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/admin/calendars"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Company calendars</div>
                  <div className="text-xs text-gray-600">Working hours & Jalali holidays</div>
                </a>
                <a
                  href="/admin/approvals"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Approve requests</div>
                  <div className="text-xs text-gray-600">Timesheets & leave</div>
                </a>
                <a
                  href="/admin/departments"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Manage departments</div>
                  <div className="text-xs text-gray-600">Directors & managers</div>
                </a>
                <a
                  href="/admin/sites"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Sites & geofence</div>
                  <div className="text-xs text-gray-600">Locations, Wi-Fi, radius</div>
                </a>
              </div>
            )}

            {/* Department-level actions */}
            {!canCompanyAdmin && canDeptManage && (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/dept/schedule"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Team schedule</div>
                  <div className="text-xs text-gray-600">Shifts & exceptions</div>
                </a>
                <a
                  href="/dept/approvals"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Team approvals</div>
                  <div className="text-xs text-gray-600">Leaves & corrections</div>
                </a>
              </div>
            )}

            {/* Employee-only actions */}
            {!canCompanyAdmin && !canDeptManage && (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/me/attendance"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">My attendance</div>
                  <div className="text-xs text-gray-600">Clock history & status</div>
                </a>
                <a
                  href="/me/leave"
                  className="group rounded-xl border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="mb-1 font-medium">Request leave</div>
                  <div className="text-xs text-gray-600">Hourly or daily</div>
                </a>
              </div>
            )}
          </div>

          {/* KPI stub */}
          <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-3 text-sm font-semibold">Today</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-600">In office</div>
                <div className="mt-1 text-xl font-semibold">—</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-600">On leave</div>
                <div className="mt-1 text-xl font-semibold">—</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-600">Late arrivals</div>
                <div className="mt-1 text-xl font-semibold">—</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-600">Pending approvals</div>
                <div className="mt-1 text-xl font-semibold">—</div>
              </div>
            </div>
          </div>
        </section>

        {/* Activity placeholder */}
        <section className="mt-6 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-3 text-sm font-semibold">Activity</h2>
          <p className="text-sm text-gray-600">
            Real-time attendance, leave requests, and approvals will appear here.
          </p>
        </section>
      </div>
    </main>
  );
}
