import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';

// UTC day window (simple & reliable; we can add per-user TZ later)
function utcDayRange(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

export async function GET() {
  try {
    const user = await requireUser();

    const last = await prisma.attendanceEvent.findFirst({
      where: { userId: user.id },
      orderBy: { at: 'desc' },
      select: { type: true, at: true },
    });
    const currentAction = last?.type === 'CLOCK_IN' ? 'CLOCK_OUT' : 'CLOCK_IN';

    const { start, end } = utcDayRange(new Date());
    const events = await prisma.attendanceEvent.findMany({
      where: { userId: user.id, at: { gte: start, lt: end } },
      orderBy: { at: 'asc' },
      select: {
        id: true, type: true, at: true, source: true, withinGeofence: true, wifiBSSID: true, latitude: true, longitude: true,
      },
    });

    return NextResponse.json({ ok: true, currentAction, events });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
