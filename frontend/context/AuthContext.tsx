import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { oauthApi, type GuestUser } from '../api/oauth';
import { authApi } from '../api/auth';

type AuthContextValue = {
  user: GuestUser | null;
  isAdmin: boolean;
  role: 'admin' | 'editor' | 'author' | 'guest';
  loading: boolean;
  login: (provider: 'github' | 'gitee') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'admin' | 'editor' | 'author' | 'guest'>('guest');
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      // /api/user/me handles both admin and guest users
      const userData = await oauthApi.me();
      setUser(userData);
      setIsAdmin(userData.is_admin ?? false);
      setRole(userData.role ?? 'guest');
    } catch {
      setUser(null);
      setIsAdmin(false);
      setRole('guest');
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
      setRole('guest');
    }
  }, [isAdmin]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, role, loading, login, logout, refreshUser }}>
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
