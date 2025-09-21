import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { z } from 'zod';
import { requireUser } from '@/lib/session';

// NOTE: wifiSSIDs in WorkSite can hold SSIDs or BSSIDs (MACs). We match case-insensitively.
const Body = z.object({
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT']).optional(),     // if omitted => toggle
  notes: z.string().max(500).optional(),
  source: z.enum(['WEB', 'MOBILE', 'KIOSK']).optional(),  // default WEB
  // Prefer Wi-Fi match; if not available, use GPS:
  wifiBSSID: z.string().min(1).optional(),                // e.g., "AA:BB:CC:DD:EE:FF" or SSID
  lat: z.number().optional(),
  lng: z.number().optional(),
});

function getIP(req: Request) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? undefined;
}

function toRad(x: number) { return (x * Math.PI) / 180; }
// Haversine distance in meters
function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeWifi(val?: string | null) {
  return (val ?? '').trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = Body.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const { type, notes, source = 'WEB', wifiBSSID, lat, lng } = body.data;

    // Determine next type (toggle) if not provided
    const last = await prisma.attendanceEvent.findFirst({
      where: { userId: user.id },
      orderBy: { at: 'desc' },
      select: { type: true },
    });
    const nextType = type ?? (last?.type === 'CLOCK_IN' ? 'CLOCK_OUT' : 'CLOCK_IN');

    // Fetch org sites
    const sites = await prisma.workSite.findMany({
      where: { orgId: user.orgId },
    });

    let matchedSiteName: string | null = null;
    let withinGeofence: boolean | null = null;

    // 1) Prefer Wi-Fi (match against any stored SSID/BSSID string, case-insensitive)
    const wifiNorm = normalizeWifi(wifiBSSID);
    if (wifiNorm && sites.length) {
      for (const s of sites) {
        const anyMatch = (s.wifiSSIDs ?? []).some((entry) => normalizeWifi(entry) === wifiNorm);
        if (anyMatch) {
          withinGeofence = true;
          matchedSiteName = s.name;
          break;
        }
      }
      if (withinGeofence === null) withinGeofence = false;
    }

    // 2) Fallback to GPS if no Wi-Fi verdict
    if (withinGeofence === null && typeof lat === 'number' && typeof lng === 'number' && sites.length) {
      let inAny = false;
      let foundName: string | null = null;
      for (const s of sites) {
        const d = metersBetween(Number(lat), Number(lng), Number(s.latitude), Number(s.longitude));
        if (d <= s.radiusMeters) {
          inAny = true;
          foundName = s.name;
          break;
        }
      }
      withinGeofence = inAny;
      matchedSiteName = foundName;
    }

    const ip = getIP(req);

    const ev = await prisma.attendanceEvent.create({
      data: {
        userId: user.id,
        type: nextType,
        source,
        at: new Date(), // server time is authoritative
        latitude: typeof lat === 'number' ? String(lat) as any : null,
        longitude: typeof lng === 'number' ? String(lng) as any : null,
        withinGeofence: withinGeofence ?? null,
        ip: ip ?? null,
        wifiBSSID: wifiBSSID ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: ev.id,
        type: ev.type,
        at: ev.at,
        withinGeofence: ev.withinGeofence,
        site: matchedSiteName,
      },
      next: nextType,
    });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
