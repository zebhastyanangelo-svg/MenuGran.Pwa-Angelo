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

function RootRedirect() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Comprobando sesión..." />;
  }

  if (user !== null && location.pathname === '/') {
    if (profile?.role === 'customer') {
      return <Navigate to="/" replace />;
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
                  <Route path="/admin" element={<ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}><MerchantDashboardPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
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
