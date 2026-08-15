import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { authRoutes } from './navItems';

export function Layout() {
  const { pathname } = useLocation();
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  return (
    <div className="min-h-screen bg-slate-50">
      {!isAuthRoute && <Sidebar />}
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 md:pb-4 md:pl-64">
        <Outlet />
      </main>
      {!isAuthRoute && <BottomNav />}
    </div>
  );
}
