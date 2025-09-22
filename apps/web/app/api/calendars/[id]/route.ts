import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';
import { hhmmToMinutes } from '@/lib/time';

const UpdateBody = z.object({
  name: z.string().min(2).max(80),
  timezone: z.string().min(1),
  weekendDays: z.array(z.number().int().min(0).max(6)).default([]),
  rules: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      isOff: z.boolean(),
      start: z.string().nullable().optional(), // "HH:MM" or null
      end: z.string().nullable().optional(),
    })
  ).length(7),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const payload = await req.json().catch(() => ({}));
    const parsed = UpdateBody.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    // Ensure calendar is in org
    const cal = await prisma.workCalendar.findUnique({ where: { id: params.id } });
    if (!cal || cal.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { name, timezone, weekendDays, rules } = parsed.data;

    // Update calendar fields
    await prisma.workCalendar.update({
      where: { id: params.id },
      data: { name, timezone, weekendDays },
    });

    // Upsert 7 weekday rules
    for (const r of rules) {
      const startMin = r.isOff ? null : hhmmToMinutes(r.start ?? '') ;
      const endMin = r.isOff ? null : hhmmToMinutes(r.end ?? '') ;
      if (!r.isOff) {
        if (startMin == null || endMin == null || startMin >= endMin) {
          return NextResponse.json({ error: 'invalid_rule', weekday: r.weekday }, { status: 400 });
        }
      }
      await prisma.calendarRule.upsert({
        where: { calendarId_weekday: { calendarId: params.id, weekday: r.weekday } },
        update: { isOff: r.isOff, startMin, endMin },
        create: { calendarId: params.id, weekday: r.weekday, isOff: r.isOff, startMin, endMin },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const cal = await prisma.workCalendar.findUnique({
      where: { id: params.id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!cal || cal.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (cal._count.assignments > 0) {
      return NextResponse.json({ error: 'in_use' }, { status: 409 });
    }

    await prisma.workCalendar.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
