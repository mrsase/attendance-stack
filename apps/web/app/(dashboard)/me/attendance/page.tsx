'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type EventItem = {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  at: string;
  source: 'WEB' | 'MOBILE' | 'KIOSK';
  withinGeofence: boolean | null;
  wifiBSSID: string | null;
  latitude: string | null;
  longitude: string | null;
};

type TodayResponse = {
  ok: true;
  currentAction: 'CLOCK_IN' | 'CLOCK_OUT';
  status: 'IN' | 'OUT';
  since: string | null;
  throttleSecondsLeft: number;
  events: EventItem[];
};

function StatusChip({ status, since }: { status: 'IN' | 'OUT'; since: string | null }) {
  const sinceStr = since ? new Date(since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const label = status === 'IN' ? `Clocked in${sinceStr ? ` since ${sinceStr}` : ''}` : 'Out';
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1',
        status === 'IN' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-700 ring-gray-200',
      ].join(' ')}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

export default function MyAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [throttleLeft, setThrottleLeft] = useState(0);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch('/api/attendance/today', { cache: 'no-store' });
    if (!res.ok) {
      setErr('Failed to load today');
      return;
    }
    const j = (await res.json()) as TodayResponse;
    setToday(j);
    setThrottleLeft(j.throttleSecondsLeft ?? 0);
  }, []);

  useEffect(() => { load(); }, [load]);

  // countdown for throttle
  useEffect(() => {
    if (throttleLeft <= 0) return;
    const t = setInterval(() => {
      setThrottleLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [throttleLeft]);

  const buttonLabel = useMemo(() => {
    if (!today) return '…';
    return today.currentAction === 'CLOCK_IN' ? 'Clock In' : 'Clock Out';
  }, [today]);

  async function getPosition(): Promise<GeolocationPosition | null> {
    if (!('geolocation' in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  const punch = useCallback(async () => {
    if (!today) return;
    setLoading(true);
    setMsg(null);
    setErr(null);

    let lat: number | undefined;
    let lng: number | undefined;
    const pos = await getPosition();
    if (pos) {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    }

    try {
      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: today.currentAction,
          source: 'WEB',
          lat, lng,
          wifiBSSID: undefined, // browsers can't access BSSID
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429 && typeof j.retryAfterSeconds === 'number') {
          setThrottleLeft(j.retryAfterSeconds);
          setErr(`Please wait ${j.retryAfterSeconds}s before punching again.`);
        } else {
          setErr(j.error || 'Punch failed');
        }
        return;
      }

      const j = await res.json();
      const within = j?.event?.withinGeofence;
      const site = j?.event?.site as string | undefined;
      setMsg(
        `${today.currentAction === 'CLOCK_IN' ? 'Clocked in' : 'Clocked out'} • ` +
        (within === true ? `Inside${site ? ' (' + site + ')' : ''}` : within === false ? 'Outside site' : 'No location')
      );
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Punch failed');
    } finally {
      setLoading(false);
    }
  }, [today, load]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My attendance</h1>
          <p className="mt-1 text-sm text-gray-600">Clock history & current status.</p>
        </div>
        {today && <StatusChip status={today.status} since={today.since} />}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={punch}
          disabled={!today || loading || throttleLeft > 0}
          className={[
            'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-white transition',
            today?.currentAction === 'CLOCK_IN'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-rose-600 hover:bg-rose-700',
            (loading || throttleLeft > 0) && 'opacity-70'
          ].filter(Boolean).join(' ')}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Processing…
            </>
          ) : throttleLeft > 0 ? (
            <>Wait {throttleLeft}s</>
          ) : (
            <>{buttonLabel}</>
          )}
        </button>

        {msg && <span className="text-sm rounded-lg bg-green-50 px-3 py-2 text-green-700">{msg}</span>}
        {err && <span className="text-sm rounded-lg bg-red-50 px-3 py-2 text-red-700">{err}</span>}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Today’s events</h2>
        {!today?.events?.length ? (
          <p className="text-sm text-gray-600">No punches yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Geofence</th>
                </tr>
              </thead>
              <tbody>
                {today.events.map((e) => {
                  const t = new Date(e.at);
                  const time = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const geof =
                    e.withinGeofence === true ? 'Inside' :
                    e.withinGeofence === false ? 'Outside' :
                    'Unknown';
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">{time}</td>
                      <td className="px-3 py-2">{e.type === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'}</td>
                      <td className="px-3 py-2">{e.source}</td>
                      <td className="px-3 py-2">{geof}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
