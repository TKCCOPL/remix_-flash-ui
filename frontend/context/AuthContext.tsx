import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { oauthApi, type GuestUser } from '../api/oauth';
import { authApi } from '../api/auth';

type AuthContextValue = {
  user: GuestUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (provider: 'github' | 'gitee') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await oauthApi.me();
      setUser(userData);
      setIsAdmin(false);
    } catch {
      try {
        await authApi.me();
        setUser(null);
        setIsAdmin(true);
      } catch {
        setUser(null);
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback((provider: 'github' | 'gitee') => {
    oauthApi.login(provider);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isAdmin) {
        await authApi.logout();
      } else {
        await oauthApi.logout();
      }
    } finally {
      setUser(null);
      setIsAdmin(false);
    }
  }, [isAdmin]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
