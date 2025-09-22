import { prisma } from '@repo/db';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { notFound, redirect } from 'next/navigation';
import RulesEditor from '@/components/calendars/RulesEditor';

const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

async function updateCalendar(formData: FormData, calId: string) {
  'use server';
  const name = String(formData.get('name') || '');
  const timezone = String(formData.get('timezone') || '');
  const weekend = (formData.getAll('weekend') as string[]).map((s) => Number(s));
  const rulesJson = String(formData.get('rulesJson') || '[]');
  const rules = JSON.parse(rulesJson) as Array<{ weekday: number; isOff: boolean; start: string | null; end: string | null }>;

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/calendars/${calId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, timezone, weekendDays: weekend, rules }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to update calendar');
  }
  redirect(`/admin/calendars/${calId}` as any);
}

async function createHoliday(formData: FormData) {
  'use server';
  const dateISO = String(formData.get('dateISO') || '');
  const name = String(formData.get('hname') || '');
  const isJalali = formData.get('isJalali') === 'on';
  const jalaliDate = String(formData.get('jalaliDate') || '');

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/holidays`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dateISO, name, isJalali, jalaliDate: jalaliDate || undefined }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to add holiday');
}

async function deleteHoliday(id: string) {
  'use server';
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/holidays/${id}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to delete holiday');
}

async function deleteCalendar(calId: string) {
  'use server';
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/calendars/${calId}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (res.status === 409) throw new Error('in_use');
  if (!res.ok) throw new Error('delete_failed');
  redirect('/admin/calendars' as any);
}

export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const allowed = !!user && hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);
  if (!allowed) return <p className="text-sm text-red-600">You do not have access.</p>;

  const cal = await prisma.workCalendar.findUnique({
    where: { id: params.id },
    include: { rules: true, _count: { select: { assignments: true } } },
  });
  if (!cal || cal.orgId !== user!.orgId) notFound();

  const holidays = await prisma.holiday.findMany({
    where: { orgId: user!.orgId },
    orderBy: { date: 'desc' },
    take: 50,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Edit calendar</h1>
          <p className="text-sm text-gray-600">Modify name, timezone, weekend, and weekly rules.</p>
        </div>
        <form action={async () => { try { await deleteCalendar(cal.id); } catch (e: any) { /* noop - we’ll rely on toast in future */ } }}>
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            disabled={cal._count.assignments > 0}
            title={cal._count.assignments > 0 ? 'Calendar is assigned to users' : 'Delete calendar'}
          >
            Delete
          </button>
        </form>
      </div>

      {/* Calendar meta + weekend */}
      <form action={(fd) => updateCalendar(fd, cal.id)} className="mb-6 grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input name="name" defaultValue={cal.name} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <input name="timezone" defaultValue={cal.timezone} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            <p className="mt-1 text-xs text-gray-500">IANA TZ (e.g., Asia/Tehran)</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Weekend days</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY.map((label, i) => (
                <label key={i} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input type="checkbox" name="weekend" value={i} defaultChecked={cal.weekendDays.includes(i)} />
                  {label} ({i})
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Weekly rules</label>
          <RulesEditor
            initial={Array.from({ length: 7 }).map((_, i) => {
              const found = cal.rules.find((r) => r.weekday === i);
              return found
                ? { weekday: i, isOff: found.isOff, startMin: found.startMin ?? null, endMin: found.endMin ?? null }
                : { weekday: i, isOff: true, startMin: null, endMin: null };
            })}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">Save changes</button>
          <a href={`/admin/calendars/${cal.id}` as any} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Cancel</a>
        </div>
      </form>

      {/* Holidays */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Holidays (org)</h2>

        <form action={createHoliday} className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_120px_120px_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium">Date (ISO)</label>
            <input name="dateISO" placeholder="YYYY-MM-DD" className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Name</label>
            <input name="hname" placeholder="Holiday name" className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </div>
          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" name="isJalali" defaultChecked />
              Jalali
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Jalali label</label>
            <input name="jalaliDate" placeholder="1404-01-01" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="flex items-end">
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">Add</button>
          </div>
        </form>

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
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const d = new Date(h.date);
                  const dateStr = d.toISOString().slice(0, 10);
                  return (
                    <tr key={h.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{dateStr}</td>
                      <td className="px-3 py-2">{h.name}</td>
                      <td className="px-3 py-2">{h.jalaliDate ?? (h.isJalali ? '—' : '')}</td>
                      <td className="px-3 py-2 text-right">
                        <form action={async () => { try { await deleteHoliday(h.id); } catch {} }}>
                          <button className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" type="submit">
                            Delete
                          </button>
                        </form>
                      </td>
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
