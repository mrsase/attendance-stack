import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { dailyTimesheet, parseISOYMD } from '@/lib/timesheet';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    }

    // Strict-safe parsing
    let fy: number, fm: number, fd: number, ty: number, tm: number, td: number;
    try {
      [fy, fm, fd] = parseISOYMD(from);
      [ty, tm, td] = parseISOYMD(to);
    } catch {
      return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    }

    const start = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0));
    const end = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0, 0));
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    if (days <= 0) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    if (days > 62) return NextResponse.json({ error: 'range_too_large' }, { status: 400 });

    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      // eslint-disable-next-line no-await-in-loop
      out.push(await dailyTimesheet(user.id, user.orgId, iso));
    }

    return NextResponse.json({ ok: true, rows: out });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
