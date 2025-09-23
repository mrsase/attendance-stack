import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { parseISOYMD, dailyTimesheet } from '@/lib/timesheet';
import { prisma } from '@repo/db';
import { toCSV } from '@/lib/csv';

export async function GET(req: Request) {
  const me = await requireUser();
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'team';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const departmentIdParam = url.searchParams.get('departmentId') || undefined;
  const userId = url.searchParams.get('userId') || undefined;

  if (!from || !to) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  let fy,fm,fd,ty,tm,td;
  try { [fy,fm,fd] = parseISOYMD(from); [ty,tm,td] = parseISOYMD(to); } catch { return NextResponse.json({ error: 'bad_range' }, { status: 400 }); }

  const start = new Date(Date.UTC(fy, fm-1, fd));
  const end = new Date(Date.UTC(ty, tm-1, td));
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days <= 0 || days > 62) return NextResponse.json({ error: 'range_limit' }, { status: 400 });

  let users: { id: string; name: string | null; email: string | null; department?: { name: string | null } | null }[] = [];

  if (scope === 'company') {
    const isOrgAdmin = hasAnyRole(me, [ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN]);
    if (!isOrgAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const departmentId = departmentIdParam || undefined;

    users = await prisma.user.findMany({
      where: {
        orgId: me.orgId,
        ...(departmentId ? { departmentId } : {}),
        ...(userId ? { id: userId } : {}),
        isActive: true,
      },
      select: { id: true, name: true, email: true, department: { select: { name: true } } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 1000,
    });
  } else {
    // team
    if (!me.departmentId) return NextResponse.json({ error: 'no_department' }, { status: 400 });
    const canTeam = hasAnyRole(me, [ROLE.DIRECTOR, ROLE.MANAGER, ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN], me.departmentId);
    if (!canTeam) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    users = await prisma.user.findMany({
      where: { orgId: me.orgId, departmentId: me.departmentId, isActive: true },
      select: { id: true, name: true, email: true, department: { select: { name: true } } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 1000,
    });
  }

  const dayIsos = Array.from({ length: days }, (_, i) =>
    new Date(start.getTime() + i * 86400000).toISOString().slice(0,10)
  );

  const rows: (string | number)[][] = [
    ['User', 'Email', 'Department', 'Day', 'Expected(min)', 'Actual(min)', 'Delta(min)'],
  ];

  for (const u of users) {
    let expected = 0, actual = 0;
    for (const iso of dayIsos) {
      // eslint-disable-next-line no-await-in-loop
      const r = await dailyTimesheet(u.id, me.orgId, iso);
      expected += r.expectedMinutes;
      actual += r.actualMinutes;
      rows.push([
        u.name ?? u.email ?? u.id.slice(0,8),
        u.email ?? '',
        u.department?.name ?? '',
        iso,
        r.expectedMinutes,
        r.actualMinutes,
        r.deltaMinutes,
      ]);
    }
    // summary row per user
    rows.push([
      u.name ?? u.email ?? u.id.slice(0,8),
      u.email ?? '',
      u.department?.name ?? '',
      'TOTAL',
      expected,
      actual,
      actual - expected,
    ]);
  }

  const csv = toCSV(rows);
  const filename = `timesheets_${scope}_${from}_${to}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
