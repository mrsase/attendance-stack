import { prisma } from '@repo/db';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { minutesToHHMM } from '@/lib/time';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function CalendarDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const allowed =
    !!user && hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);
  if (!allowed) {
    return <p className="text-sm text-red-600">You do not have access to Calendars.</p>;
  }

  // Calendar (with rules + counts)
  const cal = await prisma.workCalendar.findUnique({
    where: { id: params.id },
    include: {
      rules: true,
      _count: { select: { assignments: true } },
      org: { select: { id: true } },
    },
  });

  if (!cal || cal.orgId !== user!.orgId) {
    notFound();
  }

  const rulesByDay = Array.from({ length: 7 }).map((_, i) =>
    cal.rules.find((r) => r.weekday === i) || null,
  );

  // Recent holidays (org-wide)
  const holidays = await prisma.holiday.findMany({
    where: { orgId: user!.orgId },
    orderBy: { date: 'desc' },
    take: 20,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calendar: {cal.name}</h1>
          <p className="text-sm text-gray-600">
            Timezone: <span className="font-mono">{cal.timezone}</span> • Weekend:{' '}
            {cal.weekendDays.length ? cal.weekendDays.map((d) => WEEKDAY[d]).join(', ') : '—'} •
            Assignments: {cal._count.assignments}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/calendars" // back to list
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Back
          </Link>
          {/* We'll add a full editor soon */}
          <Link
            href={`/admin/calendars/${cal.id}/edit` as any}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Weekly rules */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Weekly rules</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2">Weekday</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
              </tr>
            </thead>
            <tbody>
              {rulesByDay.map((r, i) => {
                const isOff = r?.isOff ?? true;
                return (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{WEEKDAY[i]} ({i})</td>
                    <td className="px-3 py-2">
                      {isOff ? (
                        <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                          Off
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          Working
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{isOff ? '—' : minutesToHHMM(r?.startMin ?? 0)}</td>
                    <td className="px-3 py-2">{isOff ? '—' : minutesToHHMM(r?.endMin ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Holidays (org) */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Recent holidays (org)</h2>
        {!holidays.length ? (
          <p className="text-sm text-gray-600">No holidays yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Date (UTC)</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Jalali</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const d = new Date(h.date);
                  const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
                  return (
                    <tr key={h.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{dateStr}</td>
                      <td className="px-3 py-2">{h.name}</td>
                      <td className="px-3 py-2">{h.jalaliDate ?? (h.isJalali ? '—' : '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
