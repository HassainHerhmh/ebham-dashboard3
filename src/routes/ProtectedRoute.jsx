import { Navigate } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

export default function ProtectedRoute({ children, user, section }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.status && user.status !== 'active') {
    return <Navigate to="/" replace />;
  }

  if (section && !hasPermission(user, section, 'view')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
