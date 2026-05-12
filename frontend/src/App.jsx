import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const LoginPage          = lazy(() => import('./pages/LoginPage'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const MechanicDashboard  = lazy(() => import('./pages/MechanicDashboard'));
const ClientDashboard    = lazy(() => import('./pages/ClientDashboard'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-400 text-sm font-body">Завантаження...</p>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Редирект залежно від ролі
  const routes = { admin: '/admin', mechanic: '/mechanic', client: '/client' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }/>

            <Route path="/mechanic" element={
              <ProtectedRoute allowedRoles="mechanic">
                <MechanicDashboard />
              </ProtectedRoute>
            }/>

            <Route path="/client" element={
              <ProtectedRoute allowedRoles="client">
                <ClientDashboard />
              </ProtectedRoute>
            }/>

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;