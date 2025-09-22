'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CalendarForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Tehran');
  const [weekendDays, setWeekendDays] = useState<number[]>([5]);
  const [template, setTemplate] = useState<'IR_DEFAULT' | 'EMPTY'>('IR_DEFAULT');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleWeekend(d: number) {
    setWeekendDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, timezone, weekendDays, template }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create calendar');
      }
      const j = await res.json();
      setMsg('Created');
      router.push(`/admin/calendars/${j.id}` as any);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to create calendar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Timezone</label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="Asia/Tehran"
          required
        />
        <p className="mt-1 text-xs text-gray-500">IANA timezone (e.g., Asia/Tehran).</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Weekend days</label>
        <div className="flex flex-wrap gap-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, i) => (
            <label key={i} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={weekendDays.includes(i)}
                onChange={() => toggleWeekend(i)}
              />
              {label} ({i})
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Template</label>
        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="template"
              checked={template === 'IR_DEFAULT'}
              onChange={() => setTemplate('IR_DEFAULT')}
            />
            Iran default (Sun–Wed 09–17, Thu 09–13, Fri off)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="template"
              checked={template === 'EMPTY'}
              onChange={() => setTemplate('EMPTY')}
            />
            Empty (all days off)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create calendar'}
        </button>
        {msg && <span className="text-sm rounded bg-green-50 px-3 py-2 text-green-700">{msg}</span>}
        {err && <span className="text-sm rounded bg-red-50 px-3 py-2 text-red-700">{err}</span>}
      </div>
    </form>
  );
}
