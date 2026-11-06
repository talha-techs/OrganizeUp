import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { saveAuthRedirect, isSafeRedirect } from '../../utils/authRedirect';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    const returnPath = location.pathname + (location.search || '') + (location.hash || '');
    if (isSafeRedirect(returnPath)) {
      saveAuthRedirect(returnPath);
    }
    const redirectParam = encodeURIComponent(returnPath);
    return <Navigate to={`/login?redirect=${redirectParam}`} state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
