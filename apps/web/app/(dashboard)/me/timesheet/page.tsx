'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  day: string;
  expectedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  sessions: { start: string; end: string }[];
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function minsToHMM(mins: number) {
  const sign = mins < 0 ? '-' : '';
  const m = Math.abs(mins);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${sign}${pad(h)}:${pad(mm)}`;
}

export default function Page() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    const d2 = new Date(d.getTime() - 13 * 86400000);
    return d2.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/timesheets/me?from=${from}&to=${to}`, { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'load_failed');
      }
      const j = await res.json();
      setRows(j.rows as Row[]);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // initial

  const totals = useMemo(() => {
    const e = rows.reduce((a, r) => a + r.expectedMinutes, 0);
    const a = rows.reduce((a, r) => a + r.actualMinutes, 0);
    return { expected: e, actual: a, delta: a - e };
  }, [rows]);

  return (
    <>
      <h1 className="text-xl font-semibold">My timesheet</h1>
      <p className="mt-1 text-sm text-gray-600">Actual vs expected time per day, based on your calendar.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">From (YYYY-MM-DD)</label>
          <input className="rounded-lg border border-gray-300 px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To (YYYY-MM-DD)</label>
          <input className="rounded-lg border border-gray-300 px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">
          {loading ? 'Loading…' : 'Refresh'}
        </button>

        <div className="ml-auto rounded-xl border px-3 py-2 text-sm">
          <span className="mr-3">Expected: <b>{minsToHMM(totals.expected)}</b></span>
          <span className="mr-3">Actual: <b>{minsToHMM(totals.actual)}</b></span>
          <span>Delta: <b className={totals.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{minsToHMM(totals.delta)}</b></span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2">Delta</th>
              <th className="px-3 py-2">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-t">
                <td className="px-3 py-2 font-mono">{r.day}</td>
                <td className="px-3 py-2">{minsToHMM(r.expectedMinutes)}</td>
                <td className="px-3 py-2">{minsToHMM(r.actualMinutes)}</td>
                <td className="px-3 py-2">
                  <span className={r.deltaMinutes >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {minsToHMM(r.deltaMinutes)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.sessions.length ? (
                    <ul className="list-inside list-disc">
                      {r.sessions.map((s, i) => (
                        <li key={i} className="font-mono">
                          {s.start.slice(11, 16)}–{s.end.slice(11, 16)} UTC
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
