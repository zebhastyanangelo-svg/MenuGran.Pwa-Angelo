import { Outlet, useLocation, useBlocker } from 'react-router-dom';
import { useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { authRoutes } from './navItems';
import { ActiveOrderBanner } from '../orders/ActiveOrderBanner';
import { useActiveOrder } from '../../hooks/useActiveOrder';

export function Layout() {
  const { pathname } = useLocation();
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const { showToast } = useToast();
  const { isActive } = useActiveOrder();

  const blocker = useBlocker(
    ({ nextLocation }) => isActive && nextLocation.pathname === '/checkout',
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      showToast({
        variant: 'error',
        title: 'Pedido activo',
        message: 'Ya tienes un pedido en proceso. No puedes ir al checkout.',
        durationMs: 5000,
      });
      blocker.reset();
    }
  }, [blocker.state, showToast, blocker.reset]);

  return (
    <div className="min-h-screen bg-slate-50">
      {!isAuthRoute && <Sidebar />}
      <ActiveOrderBanner />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 md:pb-4 md:pl-64">
        <Outlet />
      </main>
      {!isAuthRoute && <BottomNav />}
    </div>
  );
}