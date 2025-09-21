'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Site = {
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  wifiSSIDs?: string[];
};

export default function SiteForm({ initial }: { initial?: Site }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [latitude, setLatitude] = useState<number | ''>(initial?.latitude ?? '');
  const [longitude, setLongitude] = useState<number | ''>(initial?.longitude ?? '');
  const [radius, setRadius] = useState<number | ''>(initial?.radiusMeters ?? 150);
  const [wifiText, setWifiText] = useState((initial?.wifiSSIDs ?? []).join('\n'));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = {
        name,
        latitude: typeof latitude === 'number' ? latitude : Number(latitude),
        longitude: typeof longitude === 'number' ? longitude : Number(longitude),
        radiusMeters: typeof radius === 'number' ? radius : Number(radius),
        wifiList: wifiText,
      };

      const res = await fetch(initial?.id ? `/api/sites/${initial.id}` : '/api/sites', {
        method: initial?.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save site');
      }

      setMsg('Saved');
      router.push('/admin/sites');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save site');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm('Delete this site?')) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/sites/${initial.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to delete');
      }
      router.push('/admin/sites');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete');
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Latitude</label>
          <input
            type="number"
            step="0.000001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Longitude</label>
          <input
            type="number"
            step="0.000001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Radius (meters)</label>
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={radius}
            onChange={(e) => setRadius(e.target.value === '' ? '' : Number(e.target.value))}
            min={10}
            max={5000}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Wi-Fi SSIDs / BSSIDs</label>
        <textarea
          className="min-h-[7rem] w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder={'One per line or comma-separated\nExample:\nACME_OFFICE\nAA:BB:CC:DD:EE:FF'}
          value={wifiText}
          onChange={(e) => setWifiText(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">We’ll match case-insensitively. Browsers can’t read BSSID; mobile app will send it.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Save site'}
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        )}
        {msg && <span className="text-sm rounded bg-green-50 px-3 py-2 text-green-700">{msg}</span>}
        {err && <span className="text-sm rounded bg-red-50 px-3 py-2 text-red-700">{err}</span>}
      </div>
    </form>
  );
}
