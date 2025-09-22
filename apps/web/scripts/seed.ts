// apps/web/scripts/seed.ts

// --- Load environment variables for the seed run ---
// We try common locations in this monorepo; only set if not already present.
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Prefer the db package .env (used for Prisma CLI), then web .env.local, then repo root .env
loadEnv({ path: resolve(process.cwd(), '../../packages/db/.env') });
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: false });
loadEnv({ path: resolve(process.cwd(), '../../.env'), override: false });

// --- Actual seed code ---
import { prisma } from '@repo/db';
import { hashPassword } from '@/lib/password';

type SeedUser = {
  name: string;
  email: string;
  roles: Array<{
    role:
      | 'SUPER_ADMIN'
      | 'IT_MANAGER'
      | 'HR_MANAGER'
      | 'DIRECTOR'
      | 'MANAGER'
      | 'EMPLOYEE';
    departmentName?: string;
  }>;
  departmentName?: string;
};

async function upsertDepartment(orgId: string, name: string) {
  const existing = await prisma.department.findFirst({ where: { orgId, name } });
  if (existing) return existing;
  return prisma.department.create({ data: { orgId, name } });
}

async function upsertUser(orgId: string, u: SeedUser) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  const passwordHash = await hashPassword('ChangeMe!123');

  const dept = u.departmentName ? await upsertDepartment(orgId, u.departmentName) : null;

  const user = existing
    ? await prisma.user.update({
        where: { email: u.email },
        data: {
          orgId,
          name: u.name,
          departmentId: dept?.id ?? null,
          isActive: true,
          ...(existing.passwordHash ? {} : { passwordHash }),
        },
      })
    : await prisma.user.create({
        data: {
          orgId,
          email: u.email,
          name: u.name,
          passwordHash,
          isActive: true,
          departmentId: dept?.id ?? null,
        },
      });

  // Assign roles (idempotent-ish)
  for (const r of u.roles) {
    const deptForRole = r.departmentName ? await upsertDepartment(orgId, r.departmentName) : null;
    const already = await prisma.roleAssignment.findFirst({
      where: { userId: user.id, role: r.role, departmentId: deptForRole?.id ?? null },
    });
    if (!already) {
      await prisma.roleAssignment.create({
        data: {
          userId: user.id,
          role: r.role,
          departmentId: deptForRole?.id ?? null,
        },
      });
    }
  }

  return user;
}

async function main() {
  // 1) Organization FIRST (fixes "used before declaration")
  const org = await prisma.organization.upsert({
    where: { name: 'Acme Co' },
    update: {},
    create: { name: 'Acme Co' },
  });

  // 2) Default company calendar (Sun–Wed 09:00–17:00, Thu 09:00–13:00, Fri off)
  const cal = await prisma.workCalendar.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Default Calendar' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Default Calendar',
      timezone: 'Asia/Tehran',
      weekendDays: [5], // Friday (adjust per policy)
      rules: {
        create: [
          { weekday: 0, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Sun
          { weekday: 1, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Mon
          { weekday: 2, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Tue
          { weekday: 3, startMin: 9 * 60, endMin: 17 * 60, isOff: false }, // Wed
          { weekday: 4, startMin: 9 * 60, endMin: 13 * 60, isOff: false }, // Thu (short)
          { weekday: 5, isOff: true }, // Fri
          { weekday: 6, isOff: true }, // Sat (adjust if needed)
        ],
      },
    },
  });

  // 3) Departments
  const ops = await upsertDepartment(org.id, 'Operations');
  const eng = await upsertDepartment(org.id, 'Engineering');
  const hr  = await upsertDepartment(org.id, 'HR');

  // 4) Work site (HQ) for geofence tests
  await prisma.workSite.upsert({
    where: { id: `${org.id}-hq` }, // stable ID we control
    update: {
      name: 'HQ',
      latitude: 35.7069,
      longitude: 51.4102,
      radiusMeters: 150,
      wifiSSIDs: ['ACME_OFFICE', 'ACME_GUEST'],
    },
    create: {
      id: `${org.id}-hq`,
      orgId: org.id,
      name: 'HQ',
      latitude: 35.7069,
      longitude: 51.4102,
      radiusMeters: 150,
      wifiSSIDs: ['ACME_OFFICE', 'ACME_GUEST'],
    },
  });

  // 5) Users with roles
  const users: SeedUser[] = [
    {
      name: 'IT Manager',
      email: 'it.manager@example.com',
      roles: [{ role: 'SUPER_ADMIN' }, { role: 'IT_MANAGER' }],
    },
    {
      name: 'HR Manager',
      email: 'hr.manager@example.com',
      departmentName: 'HR',
      roles: [{ role: 'HR_MANAGER' }],
    },
    {
      name: 'Ops Director',
      email: 'ops.director@example.com',
      departmentName: 'Operations',
      roles: [{ role: 'DIRECTOR', departmentName: 'Operations' }],
    },
    {
      name: 'Ops Manager',
      email: 'ops.manager@example.com',
      departmentName: 'Operations',
      roles: [{ role: 'MANAGER', departmentName: 'Operations' }],
    },
    {
      name: 'Alice Employee',
      email: 'alice.employee@example.com',
      departmentName: 'Operations',
      roles: [{ role: 'EMPLOYEE', departmentName: 'Operations' }],
    },
    {
      name: 'Bob Engineer',
      email: 'bob.engineer@example.com',
      departmentName: 'Engineering',
      roles: [{ role: 'EMPLOYEE', departmentName: 'Engineering' }],
    },
  ];

  for (const u of users) {
    const created = await upsertUser(org.id, u);
    console.log(`Seeded: ${u.name} <${u.email}> (password: ChangeMe!123) id=${created.id}`);
  }

  // 6) Assign default calendar to any user lacking an assignment
  const allUsers = await prisma.user.findMany({ where: { orgId: org.id }, select: { id: true } });
  for (const u of allUsers) {
    const assigned = await prisma.calendarAssignment.findFirst({ where: { userId: u.id } });
    if (!assigned) {
      await prisma.calendarAssignment.create({
        data: { userId: u.id, calendarId: cal.id, isPrimary: true },
      });
    }
  }

  console.log('Seed complete. Try logging in as it.manager@example.com / ChangeMe!123');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
