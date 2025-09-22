import { getCurrentUser } from '@/lib/session';
import { hasAnyRole, ROLE } from '@/lib/rbac';
import CalendarForm from '@/components/calendars/CalendarForm';

export default async function Page() {
  const user = await getCurrentUser();
  const allowed = !!user && hasAnyRole(user, [ROLE.SUPER_ADMIN, ROLE.IT_MANAGER, ROLE.HR_MANAGER]);
  if (!allowed) {
    return <p className="text-sm text-red-600">You do not have access to create calendars.</p>;
  }

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">Add calendar</h1>
      <CalendarForm />
    </>
  );
}
