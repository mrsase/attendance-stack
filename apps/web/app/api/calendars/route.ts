import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

const CreateBody = z.object({
  name: z.string().min(2).max(80),
  timezone: z.string().default('Asia/Tehran'),
  weekendDays: z.array(z.number().int().min(0).max(6)).default([5]), // Friday by default
  template: z.enum(['IR_DEFAULT', 'EMPTY']).default('IR_DEFAULT'),
});

export async function GET() {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const calendars = await prisma.workCalendar.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, timezone: true, weekendDays: true, createdAt: true, updatedAt: true,
        _count: { select: { rules: true, assignments: true } },
      },
    });

    return NextResponse.json({ ok: true, calendars });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const payload = await req.json().catch(() => ({}));
    const parsed = CreateBody.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const { name, timezone, weekendDays, template } = parsed.data;

    const created = await prisma.workCalendar.create({
      data: {
        orgId: user.orgId,
        name,
        timezone,
        weekendDays,
        rules: {
          create: template === 'IR_DEFAULT'
            ? [
                { weekday: 0, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Sun
                { weekday: 1, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Mon
                { weekday: 2, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Tue
                { weekday: 3, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Wed
                { weekday: 4, startMin: 9 * 60, endMin: 13 * 60, isOff: false }, // Thu (short)
                { weekday: 5, isOff: true }, // Fri
                { weekday: 6, isOff: true }, // Sat (adjust if needed)
              ]
            : // EMPTY template: mark all off; you’ll edit later
              Array.from({ length: 7 }).map((_, i) => ({ weekday: i, isOff: true })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (e?.code === 'P2002') return NextResponse.json({ error: 'duplicate_name' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
