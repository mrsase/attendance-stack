import type { RoleAssignment, User, Role } from '@repo/db';

export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  IT_MANAGER: 'IT_MANAGER',
  HR_MANAGER: 'HR_MANAGER',
  DIRECTOR: 'DIRECTOR',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type RoleName = keyof typeof ROLE | Role;

// The shape we expect from getCurrentUser()
export type UserWithRoles = User & {
  roles: RoleAssignment[];
  departmentId?: string | null;
};

/**
 * True if the user has `role`. If departmentId is provided, a role
 * either global (no departmentId on assignment) or matching that department is valid.
 */
export function hasRole(
  user: UserWithRoles | null | undefined,
  role: RoleName,
  departmentId?: string
): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((ra) => {
    const sameRole = String(ra.role) === String(role);
    if (!sameRole) return false;
    // Global role applies everywhere
    if (!ra.departmentId) return true;
    // Scoped role must match the provided department
    return departmentId ? ra.departmentId === departmentId : false;
  });
}

export function hasAnyRole(
  user: UserWithRoles | null | undefined,
  roles: RoleName[],
  departmentId?: string
): boolean {
  return roles.some((r) => hasRole(user, r, departmentId));
}

/** Throw on forbidden, to use in APIs */
export function requireAnyRole(
  user: UserWithRoles | null | undefined,
  roles: RoleName[],
  departmentId?: string
): void {
  if (!hasAnyRole(user, roles, departmentId)) {
    const needed = roles.map(String).join(', ');
    throw Object.assign(new Error('forbidden'), { status: 403, needed });
  }
}
