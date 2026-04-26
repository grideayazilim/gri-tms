import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USER_ROLE } from '@timesheet/shared';

/**
 * Protected Route Component - Simple wrapper
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isBooting, user } = useAuth();

  if (isBooting) {
    return <div>Yükleniyor...</div>;
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
