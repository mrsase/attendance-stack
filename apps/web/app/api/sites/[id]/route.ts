import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { requireAnyRole, ROLE } from '@/lib/rbac';

const SiteBody = z.object({
  name: z.string().min(2).max(120).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMeters: z.number().int().min(10).max(5000).optional(),
  wifiList: z.string().optional(),
});

function parseWifiList(s?: string) {
  if (!s) return undefined;
  const arr = s
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);

    const site = await prisma.workSite.findUnique({ where: { id: params.id } });
    if (!site || site.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const payload = await req.json().catch(() => ({}));
    const parsed = SiteBody.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.latitude !== undefined) data.latitude = String(parsed.data.latitude);
    if (parsed.data.longitude !== undefined) data.longitude = String(parsed.data.longitude);
    if (parsed.data.radiusMeters !== undefined) data.radiusMeters = parsed.data.radiusMeters;
    const wifiParsed = parseWifiList(parsed.data.wifiList);
    if (wifiParsed !== undefined) data.wifiSSIDs = wifiParsed;

    await prisma.workSite.update({
      where: { id: params.id },
      data,
    });

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

    const site = await prisma.workSite.findUnique({ where: { id: params.id } });
    if (!site || site.orgId !== user.orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.workSite.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
