'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { Route } from 'next';

export type NavItem = { href: Route; label: string; icon?: string };
export type NavGroup = { title: string; items: NavItem[] };

export default function SidebarClient({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="p-4">
      <div className="mb-4 px-2">
        <Link href={"/dashboard" as Route} className="block text-lg font-semibold tracking-tight text-slate-900">
          Attendance Stack
        </Link>
        <div className="text-xs text-slate-500">Attendance • Leave • Timesheets</div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.title}</div>
            <ul className="mt-2 space-y-1">
              {g.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <span className="w-5 text-center">{item.icon ?? '•'}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
