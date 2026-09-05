import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { ReloadPrompt } from './components/pwa/ReloadPrompt';
import { NotificationToastProvider, NotificationToastList } from './components/pwa/NotificationToast';
import { Analytics } from '@vercel/analytics/react';
import { PageLoader } from './components/PageLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { CartFab } from './components/cart/CartFab';

const LoginPage = lazy(() => import('./pages/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((mod) => ({ default: mod.RegisterPage })));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage').then((mod) => ({ default: mod.MarketplacePage })));
const MerchantStorePage = lazy(() => import('./pages/MerchantStorePage').then((mod) => ({ default: mod.MerchantStorePage })));
const MerchantDashboardPage = lazy(() =>
  import('./pages/MerchantDashboardPage').then((mod) => ({ default: mod.MerchantDashboardPage })),
);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((mod) => ({ default: mod.NotFoundPage })));
const Checkout = lazy(() => import('./pages/Checkout').then((mod) => ({ default: mod.Checkout })));
const OrderTracker = lazy(() => import('./pages/OrderTracker').then((mod) => ({ default: mod.OrderTracker })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((mod) => ({ default: mod.ProfilePage })));
const MerchantSettingsPage = lazy(() =>
  import('./pages/merchant/MerchantSettingsPage').then((mod) => ({ default: mod.MerchantSettingsPage })),
);
const MerchantDishesPage = lazy(() =>
  import('./pages/merchant/MerchantDishesPage').then((mod) => ({ default: mod.MerchantDishesPage })),
);
const MerchantResumenPage = lazy(() =>
  import('./pages/merchant/MerchantResumenPage').then((mod) => ({ default: mod.MerchantResumenPage })),
);
const MerchantProfilePage = lazy(() =>
  import('./pages/merchant/MerchantProfilePage').then((mod) => ({ default: mod.MerchantProfilePage })),
);
const SuperAdminMerchantsPage = lazy(() =>
  import('./pages/superadmin/SuperAdminMerchantsPage').then((mod) => ({ default: mod.SuperAdminMerchantsPage })),
);
const SuperAdminDashboardPage = lazy(() =>
  import('./pages/superadmin/SuperAdminDashboardPage').then((mod) => ({ default: mod.SuperAdminDashboardPage })),
);
const SuperAdminProfilePage = lazy(() =>
  import('./pages/superadmin/SuperAdminProfilePage').then((mod) => ({ default: mod.SuperAdminProfilePage })),
);
const SuperAdminUsersPage = lazy(() =>
  import('./pages/superadmin/SuperAdminUsersPage').then((mod) => ({ default: mod.SuperAdminUsersPage })),
);
const DriverDashboard = lazy(() =>
  import('./pages/driver/DriverDashboard').then((mod) => ({ default: mod.DriverDashboard })),
);

function RootRedirect() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Comprobando sesión..." />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  // Usuario autenticado cuyo perfil aún no llegó: nunca renderizar rutas de
  // cliente ni rebotar al login; esperar la resolución del rol real.
  if (profile === null) {
    return <PageLoader message="Cargando perfil..." />;
  }

  if (location.pathname === '/') {
    if (profile.role === 'customer') {
      return <Navigate to="/marketplace" replace />;
    }
    if (profile.role === 'superadmin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (profile.role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<PageLoader message="Cargando página..." />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/orders/:id" element={<OrderTracker />} />
                  <Route
                    path="/merchant/dashboard"
                    element={
                      <ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}>
                        <MerchantDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']} requiredPermission="can_manage_orders"><MerchantDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute requiredRole={['merchant_owner', 'superadmin']}><MerchantSettingsPage /></ProtectedRoute>} />
                  <Route path="/admin/dishes" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}><MerchantDishesPage /></ProtectedRoute>} />
                  <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']} requiredPermission="can_view_metrics"><MerchantResumenPage /></ProtectedRoute>} />
                  <Route path="/merchant/profile" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}><MerchantProfilePage /></ProtectedRoute>} />
                  <Route path="/admin/profile" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}><MerchantProfilePage /></ProtectedRoute>} />
                  <Route path="/super-admin" element={<ProtectedRoute requiredRole="superadmin" redirectTo="/"><SuperAdminMerchantsPage /></ProtectedRoute>} />
                  <Route path="/super-admin/dashboard" element={<ProtectedRoute requiredRole="superadmin" redirectTo="/"><SuperAdminDashboardPage /></ProtectedRoute>} />
                  <Route path="/super-admin/users" element={<ProtectedRoute requiredRole="superadmin" redirectTo="/"><SuperAdminUsersPage /></ProtectedRoute>} />
                  <Route path="/super-admin/profile" element={<ProtectedRoute requiredRole="superadmin" redirectTo="/"><SuperAdminProfilePage /></ProtectedRoute>} />
                  <Route
                    path="/driver"
                    element={
                      <ProtectedRoute requiredRole="driver">
                        <DriverDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
              </Suspense>
              </ErrorBoundary>
            <ReloadPrompt />
            <CartFab />
            <Analytics />
          </BrowserRouter>
          <NotificationToastList />
        </NotificationToastProvider>
        <OfflineBanner />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
