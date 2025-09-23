import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.attendanceCorrection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, action: true, status: true, proposedType: true, proposedAt: true, proposedNote: true,
        targetEventId: true, decidedAt: true, decisionNote: true,
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
