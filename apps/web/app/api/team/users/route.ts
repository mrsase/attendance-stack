import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';

export async function GET() {
  try {
    const me = await requireUser();
    if (!me.departmentId) return NextResponse.json({ ok: true, users: [] });

    const canTeam = hasAnyRole(me, [ROLE.DIRECTOR, ROLE.MANAGER, ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN], me.departmentId);
    if (!canTeam) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const users = await prisma.user.findMany({
      where: { orgId: me.orgId, departmentId: me.departmentId },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 500,
    });

    return NextResponse.json({ ok: true, users, departmentId: me.departmentId });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
