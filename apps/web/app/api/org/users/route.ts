import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';

export async function GET() {
  try {
    const me = await requireUser();
    const isOrgAdmin = hasAnyRole(me, [ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN]);
    if (!isOrgAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const depts = await prisma.department.findMany({
      where: { orgId: me.orgId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ ok: true, departments: depts });
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
