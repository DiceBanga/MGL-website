import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface OwnerRouteProps {
  children: React.ReactNode;
}

export function OwnerRoute({ children }: OwnerRouteProps) {
  const { user, isOwner, loading } = useAuth();

  console.log('OwnerRoute:', { 
    user: user?.id,
    email: user?.email,
    metadata: user?.user_metadata,
    isOwner,
    loading 
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (!isOwner) {
    console.log('Not owner, redirecting to dashboard');
    console.log('User metadata:', user.user_metadata);
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
} 