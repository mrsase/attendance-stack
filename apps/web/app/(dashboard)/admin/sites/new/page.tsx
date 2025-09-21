import SiteForm from '@/components/sites/SiteForm';
import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER])) {
    return <p className="text-sm text-red-600">You do not have access to create Sites.</p>;
  }

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">Add site</h1>
      <SiteForm />
    </>
  );
}
