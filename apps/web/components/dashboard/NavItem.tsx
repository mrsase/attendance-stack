'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

export default function NavItem({ href, label }: { href: Route; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={[
        'block rounded-lg px-3 py-2 text-sm transition',
        active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}
