import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const days = Math.min(60, Math.max(1, parseInt(url.searchParams.get('days') ?? '14', 10)));

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await prisma.attendanceEvent.findMany({
      where: { userId: user.id, at: { gte: since } },
      orderBy: { at: 'desc' },
      take: 200,
      select: { id: true, type: true, at: true, source: true, withinGeofence: true },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
