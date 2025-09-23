'use client';

import { useEffect, useMemo, useState } from 'react';

type EventRow = { id: string; type: 'CLOCK_IN'|'CLOCK_OUT'; at: string; source: 'WEB'|'MOBILE'|'KIOSK'; withinGeofence: boolean|null; };
type CorrRow = {
  id: string;
  action: 'ADD'|'UPDATE'|'DELETE';
  status: 'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED';
  proposedType: 'CLOCK_IN'|'CLOCK_OUT'|null;
  proposedAt: string|null;
  proposedNote: string|null;
  targetEventId: string|null;
  decidedAt: string|null;
  decisionNote: string|null;
};

export default function Page() {
  const [action, setAction] = useState<'ADD'|'UPDATE'|'DELETE'>('ADD');
  const [targetId, setTargetId] = useState<string>('');
  const [proposedType, setProposedType] = useState<'CLOCK_IN'|'CLOCK_OUT'>('CLOCK_IN');
  const [proposedAt, setProposedAt] = useState(''); // YYYY-MM-DDTHH:MM (UTC)
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState<string|null>(null);

  const [recent, setRecent] = useState<EventRow[]>([]);
  const [mine, setMine] = useState<CorrRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch('/api/attendance/recent?days=14', { cache: 'no-store' }),
      fetch('/api/corrections/mine', { cache: 'no-store' }),
    ]);
    if (r1.ok) {
      const j = await r1.json();
      setRecent(j.items as EventRow[]);
    }
    if (r2.ok) {
      const j = await r2.json();
      setMine(j.items as CorrRow[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const needsTarget = action !== 'ADD';
  const needsProposal = action !== 'DELETE';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          targetEventId: needsTarget ? targetId || undefined : undefined,
          proposedType: needsProposal ? proposedType : undefined,
          proposedAtISO: needsProposal ? proposedAt : undefined,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'submit_failed');
      }
      setOk('Submitted');
      setTargetId('');
      setProposedAt('');
      setNote('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Attendance corrections</h1>
      <p className="mt-1 text-sm text-gray-600">Request to add/update/delete a punch. All changes require approval.</p>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value as any)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="ADD">Add new punch</option>
            <option value="UPDATE">Update an existing punch</option>
            <option value="DELETE">Delete an existing punch</option>
          </select>
        </div>

        {needsTarget && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Target event (last 14 days)</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select an event…</option>
              {recent.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id.slice(0,8)}… • {e.type} • {new Date(e.at).toISOString().slice(0,19).replace('T',' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsProposal && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Proposed type</label>
              <select value={proposedType} onChange={(e) => setProposedType(e.target.value as any)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="CLOCK_IN">CLOCK_IN</option>
                <option value="CLOCK_OUT">CLOCK_OUT</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Proposed time (UTC)</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="2025-04-01T09:00"
                value={proposedAt}
                onChange={(e) => setProposedAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">Format: YYYY-MM-DDTHH:MM (UTC)</p>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Note (optional)</label>
          <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit correction'}
          </button>
          {ok && <span className="text-sm rounded bg-green-50 px-3 py-2 text-green-700">{ok}</span>}
          {err && <span className="text-sm rounded bg-red-50 px-3 py-2 text-red-700">{err}</span>}
        </div>
      </form>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">My correction requests</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !mine.length ? (
          <p className="text-sm text-gray-600">No correction requests yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Proposed</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.action}</td>
                    <td className="px-3 py-2">{r.targetEventId ? r.targetEventId.slice(0,8)+'…' : '—'}</td>
                    <td className="px-3 py-2">
                      {r.proposedType ?? '—'}{' '}
                      {r.proposedAt ? ' • ' + new Date(r.proposedAt).toISOString().slice(0,16).replace('T',' ') : ''}
                    </td>
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
