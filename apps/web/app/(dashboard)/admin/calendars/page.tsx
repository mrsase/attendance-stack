import { prisma } from '@repo/db';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import Link from 'next/link';

export default async function Page() {
  const user = await getCurrentUser();
  const allowed = !!user && hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);
  if (!allowed) {
    return <p className="text-sm text-red-600">You do not have access to Calendars.</p>;
  }

  const calendars = await prisma.workCalendar.findMany({
    where: { orgId: user!.orgId },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, timezone: true, weekendDays: true, updatedAt: true,
      _count: { select: { rules: true, assignments: true } },
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calendars</h1>
          <p className="text-sm text-gray-600">Company schedules, weekends, and holidays.</p>
        </div>
        <Link
          href="/admin/calendars/new"
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
        >
          Add calendar
        </Link>
      </div>

      {!calendars.length ? (
        <p className="text-sm text-gray-600">No calendars yet. Create one to define work hours.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Timezone</th>
                <th className="px-3 py-2">Weekend</th>
                <th className="px-3 py-2">Rules</th>
                <th className="px-3 py-2">Assignments</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {calendars.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.timezone}</td>
                  <td className="px-3 py-2">
                    {c.weekendDays.length ? c.weekendDays.join(', ') : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-3 py-2">{c._count.rules}</td>
                  <td className="px-3 py-2">{c._count.assignments}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/calendars/${c.id}` as any}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
