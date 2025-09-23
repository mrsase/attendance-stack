import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') ?? 'team'; // 'team' or 'company'

    const isHR = hasAnyRole(user, [ROLE.HR_MANAGER, ROLE.SUPER_ADMIN, ROLE.IT_MANAGER]);

    if (scope === 'company') {
      if (!isHR) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const items = await prisma.leaveRequest.findMany({
        where: { orgId: user.orgId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: {
          id: true, type: true, status: true, startAt: true, endAt: true, reason: true, createdAt: true,
          user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        },
      });
      return NextResponse.json({ ok: true, scope, items });
    }

    // team scope (Director/Manager in same department)
    if (!user.departmentId) return NextResponse.json({ ok: true, scope, items: [] });
    const canTeam =
      isHR || hasAnyRole(user, [ROLE.DIRECTOR, ROLE.MANAGER], user.departmentId);
    if (!canTeam) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const items = await prisma.leaveRequest.findMany({
      where: {
        orgId: user.orgId,
        status: 'PENDING',
        departmentId: user.departmentId,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        id: true, type: true, status: true, startAt: true, endAt: true, reason: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, scope, items });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
