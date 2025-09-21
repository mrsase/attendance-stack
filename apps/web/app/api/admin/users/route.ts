import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

export async function GET() {
  try {
    const user = await requireUser(); // 401 if not signed in
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER]); // 403 if lacks roles

    const count = await prisma.user.count();
    // Keep payload minimal for now
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (e?.status === 403) {
      return NextResponse.json({ error: 'forbidden', need: e.needed }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
