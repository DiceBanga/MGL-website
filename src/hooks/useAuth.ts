import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const session = supabase.auth.getSession();
    setUser(session?.user ?? null);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is an owner
          const { data: adminData } = await supabase
            .from('admins')
            .select('is_owner')
            .eq('user_id', session.user.id)
            .single();

          setIsOwner(adminData?.is_owner ?? false);
        } else {
          setIsOwner(false);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isOwner, loading };
} 