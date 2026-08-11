import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { ReloadPrompt } from './components/pwa/ReloadPrompt';
import { NotificationToastProvider, NotificationToastList } from './components/pwa/NotificationToast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { MerchantDashboardPage } from './pages/MerchantDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Checkout } from './pages/Checkout';
import { OrderTracker } from './pages/OrderTracker';

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/marketplace" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
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
            </Routes>
            <ReloadPrompt />
           </BrowserRouter>
           <NotificationToastList />
         </NotificationToastProvider>
         <OfflineBanner />
       </CartProvider>
     </AuthProvider>
   );
}

export default App;