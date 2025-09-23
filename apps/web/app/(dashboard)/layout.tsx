import '@/app/globals.css';
import { ReactNode } from 'react';
import { requireUser } from '@/lib/session';
import Sidebar from '@/components/dashboard/Sidebar';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Protect dashboard area & get the signed-in user
  const me = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <Sidebar me={me} />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <div className="text-sm text-slate-600">
                Signed in as <span className="font-medium text-slate-900">{me.name ?? me.email}</span>
              </div>
              <a
                href="/logout"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Log out
              </a>
            </div>
          </header>
          <div className="mx-auto max-w-5xl p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
