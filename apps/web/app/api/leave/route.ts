import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';

const Body = z.object({
  type: z.enum(['HOURLY', 'DAILY']),
  startISO: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/),
  endISO: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const { type, startISO, endISO, reason } = parsed.data;

    const startAt = new Date(startISO.length === 10 ? `${startISO}T00:00:00Z` : `${startISO}:00Z`);
    const endAt   = new Date(endISO.length === 10 ? `${endISO}T00:00:00Z` : `${endISO}:00Z`);

    if (!(startAt instanceof Date) || isNaN(startAt.getTime()) || !(endAt instanceof Date) || isNaN(endAt.getTime()) || startAt >= endAt) {
      return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    }

    const created = await prisma.leaveRequest.create({
  data: {
    // was: orgId: user.orgId,
    org: { connect: { id: user.orgId } },

    // was: userId: user.id,
    user: { connect: { id: user.id } },

    // was: departmentId: user.departmentId ?? null,
    ...(user.departmentId
      ? { department: { connect: { id: user.departmentId } } }
      : {}),

    type,
    status: 'PENDING',
    startAt,
    endAt,
    reason: reason ?? null,
  },
  select: { id: true },
});


    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
