import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createPlayerProfile: (userId: string, email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Check if player profile exists
    const { data: profile } = await supabase
      .from('players')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!profile) {
      // Create player profile if it doesn't exist
      await supabase.from('players').insert({
        user_id: data.user.id,
        display_name: email.split('@')[0],
        email: email
      });
    }

    // Get user role from metadata
    const role = data.user.user_metadata?.role || 'user';

    set({
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: role
      }
    });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      // Create player profile
      await supabase.from('players').insert({
        user_id: data.user.id,
        display_name: email.split('@')[0],
        email: email
      });

      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.user_metadata?.role || 'user'
        }
      });
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      // Always clear user state, even if signOut fails
      set({ user: null });
    }
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  createPlayerProfile: async (userId, email) => {
    const { error } = await supabase.from('players').insert({
      user_id: userId,
      display_name: email.split('@')[0],
      email: email
    });
    if (error) throw error;
  }
}));

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    useAuthStore.getState().setUser({
      id: session.user.id,
      email: session.user.email!,
      role: session.user.user_metadata?.role || 'user'
    });
  }
  useAuthStore.getState().loading = false;
});

// Set up auth state listener
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    useAuthStore.getState().setUser({
      id: session.user.id,
      email: session.user.email!,
      role: session.user.user_metadata?.role || 'user'
    });
  } else {
    useAuthStore.getState().setUser(null);
  }
});