import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

const SiteBody = z.object({
  name: z.string().min(2).max(120),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int().min(10).max(5000),
  wifiList: z.string().optional(), // textarea; comma/newline separated
});

function parseWifiList(s?: string) {
  if (!s) return [];
  return s
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const sites = await prisma.workSite.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true, wifiSSIDs: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, sites });
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
    const parsed = SiteBody.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const { name, latitude, longitude, radiusMeters, wifiList } = parsed.data;

    const created = await prisma.workSite.create({
      data: {
        orgId: user.orgId,
        name,
        latitude: String(latitude) as any,
        longitude: String(longitude) as any,
        radiusMeters,
        wifiSSIDs: parseWifiList(wifiList),
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
