'use client';

import { useEffect, useMemo, useState } from 'react';

type Leave = {
  id: string;
  type: 'HOURLY' | 'DAILY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startAt: string;
  endAt: string;
  reason?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
};

export default function Page() {
  const [type, setType] = useState<'HOURLY'|'DAILY'>('DAILY');
  const [startISO, setStartISO] = useState('');
  const [endISO, setEndISO] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/leave/mine', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      setRows(j.requests as Leave[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const dateLabel = useMemo(() => type === 'DAILY' ? 'Date (YYYY-MM-DD)' : 'Start (YYYY-MM-DDTHH:MM)', [type]);
  const endLabel  = useMemo(() => type === 'DAILY' ? 'End date (YYYY-MM-DD)' : 'End (YYYY-MM-DDTHH:MM)', [type]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, startISO, endISO, reason: reason || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'submit_failed');
      }
      setOk('Submitted');
      setStartISO('');
      setEndISO('');
      setReason('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Request leave</h1>
      <p className="mt-1 text-sm text-gray-600">Submit hourly or daily leave for approval.</p>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="DAILY">Daily</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{dateLabel}</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder={type === 'DAILY' ? '2025-04-01' : '2025-04-01T09:00'}
            value={startISO}
            onChange={(e) => setStartISO(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{endLabel}</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder={type === 'DAILY' ? '2025-04-02' : '2025-04-01T17:00'}
            value={endISO}
            onChange={(e) => setEndISO(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Reason (optional)</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you requesting leave?"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={submitting} className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          {ok && <span className="text-sm rounded bg-green-50 px-3 py-2 text-green-700">{ok}</span>}
          {err && <span className="text-sm rounded bg-red-50 px-3 py-2 text-red-700">{err}</span>}
        </div>
      </form>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">My requests</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !rows.length ? (
          <p className="text-sm text-gray-600">No requests yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2 font-mono">{new Date(r.startAt).toISOString().slice(0,16).replace('T',' ')}</td>
                    <td className="px-3 py-2 font-mono">{new Date(r.endAt).toISOString().slice(0,16).replace('T',' ')}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.decisionNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
