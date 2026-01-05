import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export interface AuthContext {
  userId: string;
  identityId?: string;
  userName: string;
  email: string;
  groups: string[];
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    void checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Hook to get authenticated user info
export function useAuth() {
  const [auth, setAuth] = useState<AuthContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { userId, username } = await getCurrentUser();
        const attrs = await fetchUserAttributes();
        const session = await fetchAuthSession();

        const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];

        setAuth({
          userId,
          identityId: session.identityId,
          userName: attrs.nickname || attrs.preferred_username || username || 'user',
          email: attrs.email || '',
          groups,
        });
      } catch {
        setAuth(null);
      } finally {
        setIsLoading(false);
      }
    };
    void loadAuth();
  }, []);

  return { auth, isLoading };
}

export default ProtectedRoute;
