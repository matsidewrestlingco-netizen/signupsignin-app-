import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrg?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireOrg = false, requireAdmin = false }: ProtectedRouteProps) {
  const { currentUser, loading, userProfile } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrg();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile is missing after auth resolves, send to org creation
  if (requireOrg && userProfile === null) {
    return <Navigate to="/setup/organization" replace />;
  }

  if (requireOrg && userProfile && Object.keys(userProfile.organizations).length === 0) {
    return <Navigate to="/setup/organization" replace />;
  }

  if (requireAdmin) {
    if (orgLoading || !currentOrg || !userProfile) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        </div>
      );
    }
    if (userProfile.organizations[currentOrg.id] !== 'admin') {
      return <Navigate to="/parent" replace />;
    }
  }

  return <>{children}</>;
}
