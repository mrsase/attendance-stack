import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';

const Body = z.object({
  action: z.enum(['ADD', 'UPDATE', 'DELETE']),
  targetEventId: z.string().cuid().optional(), // required for UPDATE/DELETE
  proposedType: z.enum(['CLOCK_IN','CLOCK_OUT']).optional(), // required for ADD/UPDATE
  proposedAtISO: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(), // UTC naive; we append :00Z
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const { action, targetEventId, proposedType, proposedAtISO, note } = parsed.data;

    if ((action === 'UPDATE' || action === 'DELETE') && !targetEventId) {
      return NextResponse.json({ error: 'target_required' }, { status: 400 });
    }
    if ((action === 'ADD' || action === 'UPDATE') && (!proposedType || !proposedAtISO)) {
      return NextResponse.json({ error: 'proposal_required' }, { status: 400 });
    }

    // Minimal sanity: target must belong to user (if provided)
    if (targetEventId) {
      const ev = await prisma.attendanceEvent.findUnique({
        where: { id: targetEventId },
        select: { id: true, userId: true, at: true },
      });
      if (!ev || ev.userId !== user.id) {
        return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
      }
    }

    const proposedAt =
      proposedAtISO ? new Date(`${proposedAtISO}:00Z`) : undefined;
    if (proposedAtISO && (isNaN(proposedAt!.getTime()))) {
      return NextResponse.json({ error: 'bad_timestamp' }, { status: 400 });
    }

    const created = await prisma.attendanceCorrection.create({
      data: {
        org: { connect: { id: user.orgId } },
        user: { connect: { id: user.id } },
        ...(user.departmentId ? { department: { connect: { id: user.departmentId } } } : {}),
        action,
        ...(targetEventId ? { targetEvent: { connect: { id: targetEventId } } } : {}),
        proposedType: proposedType as any,
        proposedAt,
        proposedNote: note ?? null,
        status: 'PENDING',
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
