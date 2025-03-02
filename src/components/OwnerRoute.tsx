import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // You'll need to create this hook

interface OwnerRouteProps {
  children: React.ReactNode;
}

export function OwnerRoute({ children }: OwnerRouteProps) {
  const { user, isOwner, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isOwner) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
} 