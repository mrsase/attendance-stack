import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { z } from 'zod';

const Body = z.object({
  action: z.enum(['APPROVE','REJECT']),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const corr = await prisma.attendanceCorrection.findUnique({
      where: { id: params.id },
      select: {
        id: true, orgId: true, status: true, departmentId: true, action: true,
        targetEventId: true, proposedType: true, proposedAt: true, userId: true,
      },
    });
    if (!corr || corr.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (corr.status !== 'PENDING') return NextResponse.json({ error: 'not_pending' }, { status: 409 });

    const isHR = hasAnyRole(user, [ROLE.HR_MANAGER, ROLE.SUPER_ADMIN, ROLE.IT_MANAGER]);
    const canTeam = !!corr.departmentId && hasAnyRole(user, [ROLE.DIRECTOR, ROLE.MANAGER], corr.departmentId);
    if (!isHR && !canTeam) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { action, note } = parsed.data;
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const approverRole = isHR ? 'HR_MANAGER' : hasAnyRole(user, [ROLE.DIRECTOR]) ? 'DIRECTOR' : 'MANAGER';

    // Apply change if approved
    if (newStatus === 'APPROVED') {
      if (corr.action === 'ADD') {
        if (!corr.proposedAt || !corr.proposedType) {
          return NextResponse.json({ error: 'proposal_missing' }, { status: 400 });
        }
        await prisma.attendanceEvent.create({
          data: {
            user: { connect: { id: corr.userId } },
            type: corr.proposedType,
            source: 'WEB', // or 'MOBILE' if you pass through; mark as correction
            at: corr.proposedAt,
            notes: '[CORRECTION]',
          },
        });
      } else if (corr.action === 'UPDATE') {
        if (!corr.targetEventId || !corr.proposedAt || !corr.proposedType) {
          return NextResponse.json({ error: 'target_or_proposal_missing' }, { status: 400 });
        }
        const ev = await prisma.attendanceEvent.findUnique({
          where: { id: corr.targetEventId },
          select: { id: true, userId: true },
        });
        if (!ev || ev.userId !== corr.userId) {
          return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
        }
        await prisma.attendanceEvent.update({
          where: { id: ev.id },
          data: { type: corr.proposedType, at: corr.proposedAt, notes: '[CORRECTION]' },
        });
      } else if (corr.action === 'DELETE') {
        if (!corr.targetEventId) {
          return NextResponse.json({ error: 'target_missing' }, { status: 400 });
        }
        const ev = await prisma.attendanceEvent.findUnique({
          where: { id: corr.targetEventId },
          select: { id: true, userId: true },
        });
        if (!ev || ev.userId !== corr.userId) {
          return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
        }
        await prisma.attendanceEvent.delete({ where: { id: ev.id } });
      }
    }

    await prisma.attendanceCorrection.update({
      where: { id: corr.id },
      data: {
        status: newStatus,
        approver: { connect: { id: user.id } },
        approverRole,
        decisionNote: note ?? null,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
