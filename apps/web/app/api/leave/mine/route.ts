import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, type: true, status: true, startAt: true, endAt: true, reason: true, decidedAt: true, decisionNote: true },
    });
    return NextResponse.json({ ok: true, requests: items });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
