import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

const CreateBody = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2).max(120),
  isJalali: z.boolean().optional().default(true),
  jalaliDate: z.string().optional(), // optional free text like "1404-01-01"
});

function dateFromISO(iso: string): Date {
  // Treat the split parts as a strict 3-tuple to avoid `possibly undefined`
  const [yStr, mStr, dStr] = iso.split('-') as [string, string, string];

  const y = Number.parseInt(yStr, 10);
  const m = Number.parseInt(mStr, 10);
  const d = Number.parseInt(dStr, 10);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error('Invalid ISO date');
  }
  // monthIndex is 0-based
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function GET() {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const items = await prisma.holiday.findMany({
      where: { orgId: user.orgId },
      orderBy: { date: 'desc' },
      take: 200,
    });
    return NextResponse.json({ ok: true, holidays: items });
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

    const { dateISO, name, isJalali, jalaliDate } = parsed.data;

    const created = await prisma.holiday.create({
      data: {
        orgId: user.orgId,
        date: dateFromISO(dateISO),
        name,
        isJalali,
        jalaliDate: jalaliDate ?? (isJalali ? dateISO : null),
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (e?.code === 'P2002') return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
