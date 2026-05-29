/* ========================================================================
   PROTECTED ROUTE
   Kimlik doğrulaması gerektiren sayfalar için güvenli sarmalayıcı.
   ======================================================================== */
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { USER_ROLE } from '@timesheet/shared';

import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isBooting, user } = useAuth();

  if (isBooting) {
    return (
      <div className="full-screen-loader">
        <div className="spinner"></div>
        <span className="sr-only">Yükleniyor...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && user?.role !== USER_ROLE.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
