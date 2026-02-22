import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // Handle OAuth callback - check for hash fragment with access_token
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Parse the hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session manually from the URL tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            // Clean URL after processing
            window.history.replaceState(null, '', window.location.pathname);
          }
          if (error) {
            console.error('Error setting session:', error);
          }
        }
        setLoading(false);
      } else {
        // Get initial session (no hash)
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    initAuth();

    return () => {};
  }, []);

  // Fetch user profile from the users table
  const fetchUserProfile = async (authId) => {
    if (!authId) {
      setUserProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
        return null;
      }

      setUserProfile(data);
      return data;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUserProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  // Update user profile (used by CompleteProfileModal)
  const updateUserProfile = (updates) => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  // Fetch profile when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    } else {
      setUserProfile(null);
    }
  }, [user?.id]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Clean up URL after sign in
      if (event === 'SIGNED_IN' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email and password
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
    return data;
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  // Check if profile needs completion (missing first or last name)
  const needsProfileCompletion = userProfile && (!userProfile.first_name || !userProfile.last_name);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userProfile,
      profileLoading,
      needsProfileCompletion,
      updateUserProfile,
      fetchUserProfile,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Plex auth helper functions (for connecting Plex account in settings)
export async function startPlexAuth() {
  const response = await fetch(`${API_BASE}/api/plex/auth/start`, {
    method: 'POST',
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to start Plex auth');
  }

  return data;
}

export async function checkPlexAuth(pinId, pinCode) {
  const response = await fetch(
    `${API_BASE}/api/plex/auth/check?pin_id=${pinId}&pin_code=${pinCode}`
  );
  return response.json();
}
