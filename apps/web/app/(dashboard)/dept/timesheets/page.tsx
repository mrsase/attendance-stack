'use client';

import { useEffect, useMemo, useState } from 'react';

type TSRow = { day: string; expectedMinutes: number; actualMinutes: number; deltaMinutes: number; sessions: { start: string; end: string }[] };
type UserTS = {
  id: string; name: string | null; email: string | null;
  totals: { expected: number; actual: number; delta: number };
  rows: TSRow[];
};

function mins(h: number) {
  const sign = h < 0 ? '-' : '';
  const m = Math.abs(h);
  const H = Math.floor(m / 60);
  const M = m % 60;
  return `${sign}${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`;
}

export default function Page() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 13*86400000).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserTS[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/timesheets/team?from=${from}&to=${to}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'load_failed');
      const j = await res.json();
      setUsers(j.users as UserTS[]);
    } catch (e:any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    let e = 0, a = 0;
    for (const u of users) { e += u.totals.expected; a += u.totals.actual; }
    return { expected: e, actual: a, delta: a - e };
  }, [users]);

  const exportHref = `/api/timesheets/export?scope=team&from=${from}&to=${to}`;

  return (
    <>
      <h1 className="text-xl font-semibold">Team timesheets</h1>
      <p className="mt-1 text-sm text-gray-600">Range-based totals per teammate; click a row to expand daily breakdown.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">From</label>
          <input value={from} onChange={(e)=>setFrom(e.target.value)} className="rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To</label>
          <input value={to} onChange={(e)=>setTo(e.target.value)} className="rounded-lg border px-3 py-2" />
        </div>
        <button onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">{loading ? 'Loading…' : 'Refresh'}</button>
        <a href={exportHref} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Export CSV</a>

        <div className="ml-auto rounded-xl border px-3 py-2 text-sm">
          <span className="mr-3">Expected: <b>{mins(totals.expected)}</b></span>
          <span className="mr-3">Actual: <b>{mins(totals.actual)}</b></span>
          <span>Delta: <b className={totals.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{mins(totals.delta)}</b></span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2">Delta</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <DetailsRow key={u.id} u={u} />
            ))}
            {!users.length && !loading && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </>
  );
}

function DetailsRow({ u }: { u: UserTS }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t cursor-pointer hover:bg-gray-50" onClick={()=>setOpen(!open)}>
        <td className="px-3 py-2">{u.name ?? u.email ?? u.id.slice(0,8)}</td>
        <td className="px-3 py-2">{mins(u.totals.expected)}</td>
        <td className="px-3 py-2">{mins(u.totals.actual)}</td>
        <td className="px-3 py-2"><span className={u.totals.delta>=0?'text-emerald-700':'text-rose-700'}>{mins(u.totals.delta)}</span></td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td className="px-3 py-2" colSpan={4}>
            <div className="overflow-hidden rounded-lg border">
              <table className="min-w-full text-xs">
                <thead className="bg-white text-left font-semibold text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Expected</th>
                    <th className="px-3 py-2">Actual</th>
                    <th className="px-3 py-2">Delta</th>
                    <th className="px-3 py-2">Sessions (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {u.rows.map((r) => (
                    <tr key={r.day} className="border-t">
                      <td className="px-3 py-2 font-mono">{r.day}</td>
                      <td className="px-3 py-2">{mins(r.expectedMinutes)}</td>
                      <td className="px-3 py-2">{mins(r.actualMinutes)}</td>
                      <td className="px-3 py-2"><span className={r.deltaMinutes>=0?'text-emerald-700':'text-rose-700'}>{mins(r.deltaMinutes)}</span></td>
                      <td className="px-3 py-2">
                        {r.sessions.length ? r.sessions.map((s,i)=>(
                          <span key={i} className="mr-2 font-mono">{s.start.slice(11,16)}–{s.end.slice(11,16)}</span>
                        )) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
