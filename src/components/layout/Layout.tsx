import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { authRoutes } from './navItems';
import { ActiveOrderBanner } from '../orders/ActiveOrderBanner';
import { useActiveOrder } from '../../hooks/useActiveOrder';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const { showToast } = useToast();
  const { isActive } = useActiveOrder();

  useEffect(() => {
    if (isActive && pathname === '/checkout') {
      showToast({
        variant: 'error',
        title: 'Pedido activo',
        message: 'Ya tienes un pedido en proceso. No puedes ir al checkout.',
        durationMs: 5000,
      });
      navigate(-1);
    }
  }, [pathname, isActive, showToast, navigate]);

  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive]);

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