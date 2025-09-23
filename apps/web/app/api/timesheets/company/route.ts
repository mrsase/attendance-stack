import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { dailyTimesheet, parseISOYMD } from '@/lib/timesheet';

export async function GET(req: Request) {
  try {
    const me = await requireUser();
    const isOrgAdmin = hasAnyRole(me, [ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN]);
    if (!isOrgAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const departmentId = url.searchParams.get('departmentId') || undefined;
    const userId = url.searchParams.get('userId') || undefined;

    if (!from || !to) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    let fy, fm, fd, ty, tm, td;
    try { [fy,fm,fd] = parseISOYMD(from); [ty,tm,td] = parseISOYMD(to); } catch { return NextResponse.json({ error: 'bad_range' }, { status: 400 }); }

    const start = new Date(Date.UTC(fy, fm-1, fd));
    const end = new Date(Date.UTC(ty, tm-1, td));
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days <= 0 || days > 62) return NextResponse.json({ error: 'range_limit' }, { status: 400 });

    const usersQ = {
      orgId: me.orgId,
      ...(departmentId ? { departmentId } : {}),
      ...(userId ? { id: userId } : {}),
      isActive: true,
    };

    const found = await prisma.user.findMany({
      where: usersQ,
      select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 500,
    });

    const dayIsos = Array.from({ length: days }, (_, i) =>
      new Date(start.getTime() + i * 86400000).toISOString().slice(0,10)
    );

    const users = [];
    for (const u of found) {
      let expected = 0, actual = 0;
      const rows = [];
      for (const iso of dayIsos) {
        // eslint-disable-next-line no-await-in-loop
        const r = await dailyTimesheet(u.id, me.orgId, iso);
        expected += r.expectedMinutes;
        actual += r.actualMinutes;
        rows.push(r);
      }
      users.push({
        id: u.id, name: u.name, email: u.email, department: u.department?.name ?? null,
        totals: { expected, actual, delta: actual - expected },
        rows,
      });
    }

    return NextResponse.json({ ok: true, from, to, departmentId: departmentId ?? null, userId: userId ?? null, users });
  } catch (e:any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
