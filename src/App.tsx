import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { ReloadPrompt } from './components/pwa/ReloadPrompt';
import { NotificationToastProvider, NotificationToastList } from './components/pwa/NotificationToast';
import { PageLoader } from './components/PageLoader';
import { Layout } from './components/layout/Layout';
import { CartFab } from './components/cart/CartFab';

const LoginPage = lazy(() => import('./pages/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((mod) => ({ default: mod.RegisterPage })));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage').then((mod) => ({ default: mod.MarketplacePage })));
const MerchantDashboardPage = lazy(() =>
  import('./pages/MerchantDashboardPage').then((mod) => ({ default: mod.MerchantDashboardPage })),
);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((mod) => ({ default: mod.NotFoundPage })));
const Checkout = lazy(() => import('./pages/Checkout').then((mod) => ({ default: mod.Checkout })));
const OrderTracker = lazy(() => import('./pages/OrderTracker').then((mod) => ({ default: mod.OrderTracker })));

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
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders/:id" element={<OrderTracker />} />
                  <Route
                    path="/merchant/dashboard"
                    element={
                      <ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}>
                        <MerchantDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
            <ReloadPrompt />
            <CartFab />
          </BrowserRouter>
          <NotificationToastList />
        </NotificationToastProvider>
        <OfflineBanner />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
