import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import NavItem from '@/components/dashboard/NavItem';
import type { Route } from 'next';

type NavLink = { href: Route; label: string };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const always: NavLink[] = [{ href: '/dashboard', label: 'Overview' }];

  const companyAdmin = hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER])
    ? ([
        { href: '/admin/calendars', label: 'Company calendars' },
        { href: '/admin/approvals', label: 'Approve requests' },
        { href: '/admin/departments', label: 'Departments' },
        { href: '/admin/sites', label: 'Sites & geofence' },
      ] satisfies NavLink[])
    : [];

  const deptManage = hasAnyRole(user, [ROLE.DIRECTOR, ROLE.MANAGER], user.departmentId ?? undefined)
    ? ([
        { href: '/dept/schedule', label: 'Team schedule' },
        { href: '/dept/approvals', label: 'Team approvals' },
      ] satisfies NavLink[])
    : [];

  const employee = !companyAdmin.length && !deptManage.length
    ? ([
        { href: '/me/attendance', label: 'My attendance' },
        { href: '/me/leave', label: 'Request leave' },
      ] satisfies NavLink[])
    : [];

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

      {/* Body with sidebar */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur">
          <nav className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Main</p>
              <ul className="space-y-1">
                {always.map((l) => (
                  <li key={l.href}><NavItem href={l.href} label={l.label} /></li>
                ))}
              </ul>
            </div>

            {!!companyAdmin.length && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
                <ul className="space-y-1">
                  {companyAdmin.map((l) => (
                    <li key={l.href}><NavItem href={l.href} label={l.label} /></li>
                  ))}
                </ul>
              </div>
            )}

            {!!deptManage.length && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Department</p>
                <ul className="space-y-1">
                  {deptManage.map((l) => (
                    <li key={l.href}><NavItem href={l.href} label={l.label} /></li>
                  ))}
                </ul>
              </div>
            )}

            {!!employee.length && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Me</p>
                <ul className="space-y-1">
                  {employee.map((l) => (
                    <li key={l.href}><NavItem href={l.href} label={l.label} /></li>
                  ))}
                </ul>
              </div>
            )}
          </nav>

          <div className="mt-6 rounded-lg border border-gray-200 p-3 text-xs text-gray-600">
            <div className="font-medium">Signed in</div>
            <div className="truncate">{user.name}</div>
            <div className="truncate text-gray-500">{user.email}</div>
          </div>
        </aside>

        <section className="min-h-[60dvh] rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur">
          {children}
        </section>
      </div>
    </main>
  );
}
