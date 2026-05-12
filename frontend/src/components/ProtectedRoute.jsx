import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * @param {ReactNode} children — дочірні компоненти (сторінка)
 * @param {string|string[]} allowedRoles — дозволені ролі ('admin', 'mechanic', або масив)
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm font-body">Перевірка сесії...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      const redirectPath = user.role === 'admin' ? '/admin' : user.role === 'mechanic' ? '/mechanic' : '/client';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}

export default ProtectedRoute;