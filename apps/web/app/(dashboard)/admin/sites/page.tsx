import { prisma } from '@repo/db';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import Link from 'next/link';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER])) {
    return <p className="text-sm text-red-600">You do not have access to Sites.</p>;
  }

  const sites = await prisma.workSite.findMany({
    where: { orgId: user.orgId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true, wifiSSIDs: true },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sites & geofence</h1>
          <p className="text-sm text-gray-600">Office locations, radii, and Wi-Fi allow-lists.</p>
        </div>
        <Link
          href="/admin/sites/new"
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
        >
          Add site
        </Link>
      </div>

      {!sites.length ? (
        <p className="text-sm text-gray-600">No sites yet. Create one to enable geofencing.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Coords</th>
                <th className="px-3 py-2">Radius</th>
                <th className="px-3 py-2">Wi-Fi</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">
                    {String(s.latitude)} , {String(s.longitude)}
                  </td>
                  <td className="px-3 py-2">{s.radiusMeters} m</td>
                  <td className="px-3 py-2">
                    {s.wifiSSIDs?.length ? s.wifiSSIDs.join(', ') : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/sites/${s.id}/edit`}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
