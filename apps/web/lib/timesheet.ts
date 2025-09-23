import { prisma } from '@repo/db';

export function parseISOYMD(iso: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [yStr, mStr, dStr] = iso.split('-') as [string, string, string];
  const y = Number.parseInt(yStr, 10);
  const m = Number.parseInt(mStr, 10);
  const d = Number.parseInt(dStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid ISO parts: ${iso}`);
  }
  return [y, m, d];
}

// --- TZ helpers ---
// Iran (Asia/Tehran) is fixed UTC+03:30 since 2022 (no DST). We'll add generic TZ later.
function tehranOffsetMinutes() {
  return 3 * 60 + 30; // +03:30
}

export function dayUtcRangeForTzDay(dayISO: string, tz: string) {
  const [y, m, d] = parseISOYMD(dayISO);
  const base = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offsetMin = tz === 'Asia/Tehran' ? tehranOffsetMinutes() : 0; // TODO: generalize TZ later
  const startUtcMs = base - offsetMin * 60 * 1000;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  return { startUtc: new Date(startUtcMs), endUtc: new Date(endUtcMs) };
}

export function clipIntervalToDay(
  start: Date,
  end: Date,
  dayStartUtc: Date,
  dayEndUtc: Date
): [Date, Date] | null {
  const a = Math.max(start.getTime(), dayStartUtc.getTime());
  const b = Math.min(end.getTime(), dayEndUtc.getTime());
  if (a >= b) return null;
  return [new Date(a), new Date(b)];
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

// --- Calendar / expected minutes ---

const WEEKDAY = [0, 1, 2, 3, 4, 5, 6]; // Sun..Sat

async function getEffectiveCalendarForDay(userId: string, orgId: string, dayISO: string) {
  const defaultTz = 'Asia/Tehran';

  // Any calendar to infer a default tz; fallback to Tehran
  const anyCal = await prisma.workCalendar.findFirst({
    where: { orgId },
    select: { timezone: true },
  });
  const tz = anyCal?.timezone ?? defaultTz;

  const { startUtc, endUtc } = dayUtcRangeForTzDay(dayISO, tz);

  const assignment = await prisma.calendarAssignment.findFirst({
    where: {
      userId,
      OR: [
        { effectiveFrom: null, effectiveTo: null },
        {
          AND: [
            { effectiveFrom: { lte: endUtc } },
            { OR: [{ effectiveTo: null }, { effectiveTo: { gt: startUtc } }] },
          ],
        },
      ],
    },
    include: {
      calendar: { include: { rules: true } },
    },
  });

  // IMPORTANT: keep `cal` as X | undefined (never assign null)
  let cal = assignment?.calendar;

  if (!cal) {
    const def = await prisma.workCalendar.findFirst({
      where: { orgId, name: 'Default Calendar' },
      include: { rules: true },
    });
    if (def) cal = def; // convert Prisma nulls to undefined by guarding
  }

  if (!cal) {
    const fallback = await prisma.workCalendar.findFirst({
      where: { orgId },
      include: { rules: true },
    });
    if (fallback) cal = fallback;
  }

  const timezone = cal?.timezone ?? tz;
  const rules = cal?.rules ?? [];

  // Determine weekday in that TZ (we handle Tehran correctly; others TODO)
  const dayStartLocal = new Date(
    dayUtcRangeForTzDay(dayISO, timezone).startUtc.getTime() + tehranOffsetMinutes() * 60000
  );
  const weekday = dayStartLocal.getUTCDay();
  const rule = rules.find((r) => r.weekday === weekday) ?? null;

  return { timezone, rule };
}


async function getOrgHolidayOnDay(orgId: string, dayISO: string, tz: string) {
  const { startUtc, endUtc } = dayUtcRangeForTzDay(dayISO, tz);
  // Holidays are stored as UTC midnight of the local day; so they should fall within [startUtc, endUtc)
  const h = await prisma.holiday.findFirst({
    where: { orgId, date: { gte: startUtc, lt: endUtc } },
  });
  return h ?? null;
}

async function getUserLeavesOverlappingDay(userId: string, dayISO: string, tz: string) {
  const { startUtc, endUtc } = dayUtcRangeForTzDay(dayISO, tz);
  return prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      // overlap with [startUtc, endUtc)
      startAt: { lt: endUtc },
      endAt: { gt: startUtc },
    },
    select: { startAt: true, endAt: true, type: true },
  });
}

// Compute expected working minutes for that day:
// - If rule is off or it's a holiday → 0
// - Otherwise end-start minus any overlaps with approved leave windows
async function expectedMinutesForDay(userId: string, orgId: string, dayISO: string) {
  const { timezone, rule } = await getEffectiveCalendarForDay(userId, orgId, dayISO);
  if (!rule || rule.isOff) return 0;

  const holiday = await getOrgHolidayOnDay(orgId, dayISO, timezone);
  if (holiday) return 0;

  const base = Math.max(0, (rule.endMin ?? 0) - (rule.startMin ?? 0));
  if (base <= 0) return 0;

  // Leave overlap
  const leaves = await getUserLeavesOverlappingDay(userId, dayISO, timezone);
  if (!leaves.length) return base;

  const { startUtc, endUtc } = dayUtcRangeForTzDay(dayISO, timezone);
  // Map the local work window to UTC within that day
  const workStartUtc = new Date(startUtc.getTime() + (rule.startMin ?? 0) * 60000);
  const workEndUtc = new Date(startUtc.getTime() + (rule.endMin ?? 0) * 60000);

  let deducted = 0;
  for (const lv of leaves) {
    const clipped = clipIntervalToDay(lv.startAt, lv.endAt, workStartUtc, workEndUtc);
    if (clipped) {
      const [a, b] = clipped;
      deducted += minutesBetween(a, b);
    }
  }

  return Math.max(0, base - deducted);
}

// --- Pair events to sessions (clip to day) ---

export type Session = { start: Date; end: Date | null };

export function pairEventsToSessions(
  events: { type: 'CLOCK_IN' | 'CLOCK_OUT'; at: Date }[],
  dayStartUtc: Date,
  dayEndUtc: Date
): { sessions: { start: Date; end: Date }[]; open: boolean } {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  let openIn: Date | null = null;
  const out: { start: Date; end: Date }[] = [];

  for (const e of sorted) {
    if (e.type === 'CLOCK_IN') {
      if (openIn == null) openIn = e.at; // ignore repeated INs
    } else {
      if (openIn != null) {
        // close session
        const pair = [openIn, e.at] as const;
        const clipped = clipIntervalToDay(pair[0], pair[1], dayStartUtc, dayEndUtc);
        if (clipped) {
          out.push({ start: clipped[0], end: clipped[1] });
        }
        openIn = null;
      }
    }
  }

  // If session left open, we do not count it (or clip to dayEnd?) — conservative: clip to dayEnd if started before end
  if (openIn && openIn < dayEndUtc) {
    const clipped = clipIntervalToDay(openIn, dayEndUtc, dayStartUtc, dayEndUtc);
    if (clipped) {
      out.push({ start: clipped[0], end: clipped[1] });
    }
  }

  return { sessions: out, open: openIn != null };
}

export async function actualMinutesForDay(userId: string, orgId: string, dayISO: string) {
  const { timezone } = await getEffectiveCalendarForDay(userId, orgId, dayISO);
  const { startUtc, endUtc } = dayUtcRangeForTzDay(dayISO, timezone);

  const events = await prisma.attendanceEvent.findMany({
    where: { userId, at: { gte: startUtc, lt: endUtc } },
    select: { type: true, at: true },
    orderBy: { at: 'asc' },
  });

  const { sessions } = pairEventsToSessions(events as any, startUtc, endUtc);
  let total = 0;
  for (const s of sessions) total += minutesBetween(s.start, s.end);
  return { minutes: total, sessions };
}

export async function dailyTimesheet(userId: string, orgId: string, dayISO: string) {
  const expected = await expectedMinutesForDay(userId, orgId, dayISO);
  const actual = await actualMinutesForDay(userId, orgId, dayISO);
  return {
    day: dayISO,
    expectedMinutes: expected,
    actualMinutes: actual.minutes,
    sessions: actual.sessions.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    })),
    deltaMinutes: actual.minutes - expected,
  };
}
