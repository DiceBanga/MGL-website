import { useState, useEffect } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isOwner: boolean;
  loading: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkOwnerStatus = (user: User | null) => {
    if (!user) return false;
    
    const metadata = user.user_metadata;
    console.log('User metadata:', metadata); // Debug info
    
    return metadata?.role === 'owner';
  };

  const isAdmin = (user: User | null) => {
    if (!user) return false;
    const metadata = user.user_metadata;
    return metadata?.role === 'admin' || metadata?.role === 'owner';
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setIsOwner(checkOwnerStatus(currentUser));
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setIsOwner(checkOwnerStatus(currentUser));
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, isOwner, isAdmin: isAdmin(user), loading } as AuthState & { isAdmin: boolean };
} 