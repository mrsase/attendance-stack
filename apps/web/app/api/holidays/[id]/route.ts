import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const h = await prisma.holiday.findUnique({ where: { id: params.id } });
    if (!h || h.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.holiday.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
