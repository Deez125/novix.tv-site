import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pandatv_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('pandatv_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (plexUser) => {
    const userData = {
      id: plexUser.id,
      username: plexUser.username,
      email: plexUser.email,
      thumb: plexUser.thumb,
    };
    setUser(userData);
    localStorage.setItem('pandatv_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pandatv_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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

// Plex auth helper functions
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
