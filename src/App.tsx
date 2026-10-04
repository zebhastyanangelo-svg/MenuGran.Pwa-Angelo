import { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useAuth } from './hooks/useAuth';
import { useGeofencing } from './hooks/useGeofencing';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';
import { usePostHogAnalytics } from './hooks/usePostHogAnalytics';
import { usePushSubscriptionSync } from './hooks/usePushSubscriptionSync';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { ReloadPrompt } from './components/pwa/ReloadPrompt';
import { PushNotificationOnboarding } from './components/pwa/PushNotificationOnboarding';
import { NotificationToastProvider, NotificationToastList } from './components/pwa/NotificationToast';
import { CustomerOnboardingGate } from './components/onboarding/CustomerOnboardingGate';
import { CookieConsentBanner } from './components/cookies/CookieConsentBanner';
import { PwaInstallProvider } from './contexts/PwaInstallContext';
import { SplashScreen } from './components/splash/SplashScreen';

import { PageLoader } from './components/PageLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { CartFab } from './components/cart/CartFab';
import { supabase, TABLE_NAMES } from './services/supabase';
import { CUSTOMER_HOME, getPostLoginPath } from './utils/postLoginRedirect';

const LoginPage = lazy(() => import('./pages/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((mod) => ({ default: mod.RegisterPage })));
const PrivacyPolicyPage = lazy(() =>
  import('./pages/legal/PrivacyPolicyPage').then((mod) => ({ default: mod.PrivacyPolicyPage })),
);
const TermsConditionsPage = lazy(() =>
  import('./pages/legal/TermsConditionsPage').then((mod) => ({ default: mod.TermsConditionsPage })),
);
const CookiePolicyPage = lazy(() =>
  import('./pages/legal/CookiePolicyPage').then((mod) => ({ default: mod.CookiePolicyPage })),
);
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
const DriverDeliveriesPage = lazy(() =>
  import('./pages/driver/DriverDeliveriesPage').then((mod) => ({ default: mod.DriverDeliveriesPage })),
);

function RootRedirect() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isMerchantRole =
    profile?.role === 'merchant_owner' || profile?.role === 'merchant_staff';

  const { data: hasMerchant, isLoading: isMerchantChecking } = useQuery<boolean>({
    queryKey: ['merchantExists', user?.id],
    enabled: !!user && isMerchantRole,
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      const [ownerResult, staffResult] = await Promise.all([
        supabase
          .from(TABLE_NAMES.merchants)
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .limit(1),
        supabase
          .from(TABLE_NAMES.merchantStaff)
          .select('merchant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1),
      ]);
      const hasOwner = !ownerResult.error && ownerResult.data && ownerResult.data.length > 0;
      const hasStaff = !staffResult.error && staffResult.data && staffResult.data.length > 0;
      return hasOwner || hasStaff;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return <PageLoader message="Comprobando sesión..." />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (profile === null) {
    return <PageLoader message="Cargando perfil..." />;
  }

  if (location.pathname === '/') {
    if (isMerchantRole) {
      if (isMerchantChecking) {
        return <PageLoader message="Verificando comercio..." />;
      }
      if (hasMerchant === false) {
        return <Navigate to="/marketplace" replace />;
      }
    }
    const target = getPostLoginPath(searchParams.get('from'), profile.role);
    return <Navigate to={target === CUSTOMER_HOME ? '/marketplace' : target} replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  useGoogleAnalytics();
  usePostHogAnalytics();
  usePushSubscriptionSync();
  useGeofencing();
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader message="Cargando página..." />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsConditionsPage />} />
              <Route path="/cookies" element={<CookiePolicyPage />} />
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
      <ProtectedRoute requiredRole="driver" requiredPermission="can_view_assigned_deliveries">
        <DriverDashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/driver/deliveries"
    element={
      <ProtectedRoute
        requiredRole={['driver', 'merchant_owner', 'merchant_staff', 'superadmin']}
        requiredPermission="can_view_assigned_deliveries"
      >
        <DriverDeliveriesPage />
      </ProtectedRoute>
    }
  />
  <Route path="*" element={<NotFoundPage />} />
</Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <CustomerOnboardingGate />
        <ReloadPrompt />
        <PushNotificationOnboarding />
        <CartFab />
        <CookieConsentBanner />
    </>
  );
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <CartProvider>
        <NotificationToastProvider>
          <PwaInstallProvider>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <NotificationToastList />
            <OfflineBanner />
          </PwaInstallProvider>
        </NotificationToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;