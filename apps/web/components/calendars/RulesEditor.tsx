'use client';

import { useEffect, useState } from 'react';
import { minutesToHHMM, hhmmToMinutes } from '@/lib/time';

const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export type Rule = {
  weekday: number;
  isOff: boolean;
  startMin: number | null;
  endMin: number | null;
};

export default function RulesEditor({ initial }: { initial: Rule[] }) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 7 }).map((_, i) => {
      const found = initial.find((r) => r.weekday === i);
      return found ?? { weekday: i, isOff: true, startMin: null, endMin: null };
    })
  );

  function toggle(i: number) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, isOff: !r.isOff } : r
      )
    );
  }

  function setStart(i: number, val: string) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, startMin: hhmmToMinutes(val) } : r
      )
    );
  }
  function setEnd(i: number, val: string) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, endMin: hhmmToMinutes(val) } : r
      )
    );
  }

  // Expose to parent via form serialization (using a hidden input)
  const payload = rows.map((r) => ({
    weekday: r.weekday,
    isOff: r.isOff,
    start: r.isOff ? null : minutesToHHMM(r.startMin ?? 0),
    end: r.isOff ? null : minutesToHHMM(r.endMin ?? 0),
  }));

  return (
    <>
      <input type="hidden" name="rulesJson" value={JSON.stringify(payload)} />
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">Weekday</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isOff = r.isOff;
              return (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{WEEKDAY[i]} ({i})</td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!isOff} onChange={() => toggle(i)} />
                      {isOff ? 'Off' : 'Working'}
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      disabled={isOff}
                      className="w-28 rounded border border-gray-300 px-2 py-1"
                      placeholder="09:00"
                      defaultValue={isOff ? '' : minutesToHHMM(r.startMin ?? 9 * 60)}
                      onChange={(e) => setStart(i, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      disabled={isOff}
                      className="w-28 rounded border border-gray-300 px-2 py-1"
                      placeholder="17:00"
                      defaultValue={isOff ? '' : minutesToHHMM(r.endMin ?? 17 * 60)}
                      onChange={(e) => setEnd(i, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
