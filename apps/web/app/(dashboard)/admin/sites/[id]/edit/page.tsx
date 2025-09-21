import SiteForm from '@/components/sites/SiteForm';
import { prisma } from '@repo/db';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER])) {
    return <p className="text-sm text-red-600">You do not have access to edit Sites.</p>;
  }

  const s = await prisma.workSite.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true, wifiSSIDs: true, orgId: true },
  });
  if (!s || s.orgId !== user.orgId) notFound();

  const initial = {
    id: s.id,
    name: s.name,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    radiusMeters: s.radiusMeters,
    wifiSSIDs: s.wifiSSIDs ?? [],
  };

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">Edit site</h1>
      <SiteForm initial={initial} />
    </>
  );
}
