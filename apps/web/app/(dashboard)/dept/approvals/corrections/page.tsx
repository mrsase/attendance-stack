'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  action: 'ADD'|'UPDATE'|'DELETE';
  proposedType: 'CLOCK_IN'|'CLOCK_OUT'|null;
  proposedAt: string|null;
  proposedNote: string|null;
  createdAt: string;
  targetEventId: string|null;
  user: { id: string; name: string|null; email: string|null };
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/approvals/corrections?scope=team', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      setRows(j.items as Row[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function decide(id: string, action: 'APPROVE'|'REJECT') {
    const note = action === 'REJECT' ? prompt('Optional note for reject?') ?? undefined : undefined;
    const res = await fetch(`/api/corrections/${id}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) { alert('Decision failed'); return; }
    load();
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Team attendance corrections</h1>
      <p className="mt-1 text-sm text-gray-600">Requests from your department.</p>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !rows.length ? (
          <p className="text-sm text-gray-600">No pending corrections.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Proposed</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.user.name ?? r.user.email}</td>
                    <td className="px-3 py-2">
                      {r.action}{r.targetEventId ? ` • ${r.targetEventId.slice(0,8)}…` : ''}
                    </td>
                    <td className="px-3 py-2">
                      {r.proposedType ?? '—'} {r.proposedAt ? '• ' + new Date(r.proposedAt).toISOString().slice(0,16).replace('T',' ') : ''}
                    </td>
                    <td className="px-3 py-2">{r.proposedNote ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2">
                        <button onClick={() => decide(r.id,'APPROVE')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">Approve</button>
                        <button onClick={() => decide(r.id,'REJECT')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700">Reject</button>
                      </div>
                    </td>
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
