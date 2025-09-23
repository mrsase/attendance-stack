import { hasAnyRole, ROLE } from '@/lib/rbac';
// Prefer importing the canonical type from where hasAnyRole is defined:
import type { UserWithRoles } from '@/lib/rbac';
// If your project defines the type in session instead, swap to:
// import type { UserWithRoles } from '@/lib/session';

import SidebarClient, { NavGroup } from './SidebarClient';
import type { Route } from 'next';

export default function Sidebar({ me }: { me: UserWithRoles }) {
  const isOrgAdmin = hasAnyRole(me, [ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN]);
  const canTeam =
    !!me.departmentId &&
    hasAnyRole(
      me,
      [ROLE.DIRECTOR, ROLE.MANAGER, ROLE.HR_MANAGER, ROLE.IT_MANAGER, ROLE.SUPER_ADMIN],
      me.departmentId
    );

  const groups: NavGroup[] = [
    {
      title: 'My',
      items: [
        { href: '/dashboard' as Route,         label: 'Overview',    icon: '🏠' },
        { href: '/me/attendance' as Route,     label: 'Attendance',   icon: '⏱️' },
        { href: '/me/leave' as Route,          label: 'Leave',        icon: '🛫' },
        { href: '/me/corrections' as Route,    label: 'Corrections',  icon: '📝' },
        { href: '/me/timesheet' as Route,      label: 'Timesheet',    icon: '📊' },
      ],
    },
    ...(canTeam
      ? [
          {
            title: 'Team',
            items: [
              { href: '/dept/approvals' as Route,               label: 'Leave approvals',       icon: '✅' },
              { href: '/dept/approvals/corrections' as Route,   label: 'Corrections approvals', icon: '🧾' },
              { href: '/dept/timesheets' as Route,              label: 'Timesheets',            icon: '👥' },
            ],
          } as NavGroup,
        ]
      : []),
    ...(isOrgAdmin
      ? [
          {
            title: 'Admin',
            items: [
              { href: '/admin/approvals' as Route,              label: 'Leave approvals',       icon: '🗂️' },
              { href: '/admin/approvals/corrections' as Route,  label: 'Corrections approvals', icon: '🧾' },
              { href: '/admin/timesheets' as Route,             label: 'Company timesheets',    icon: '🏢' },
              { href: '/admin/calendars' as Route,              label: 'Calendars',             icon: '📆' },
              { href: '/admin/sites' as Route,                  label: 'Sites',                 icon: '📍' },
            ],
          } as NavGroup,
        ]
      : []),
  ];

  return <SidebarClient groups={groups} />;
}
