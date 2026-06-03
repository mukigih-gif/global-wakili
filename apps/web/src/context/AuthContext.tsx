'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setSession, clearSession, isAuthenticated } from '@/lib/api';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName?: string;
  isSuperAdmin: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    if (!isAuthenticated()) { setLoading(false); return; }
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (email: string, password: string, tenantId?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        // Include tenantSlug in body so the login WHERE filter can find the user.
        // buildLoginWhereFilter returns tenantId:null when neither is in body,
        // which only matches platform users — not firm users.
        ...(tenantId ? { tenantSlug: tenantId } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Invalid credentials');
    }

    const data = await res.json();
    const token: string = data.token || data.accessToken;
    const resolvedTenantId: string = data.tenantId || tenantId || '';
    const role: string = data.role || data.systemRole || '';

    if (!token) throw new Error('No token received');
    setSession(token, resolvedTenantId, role);
    await fetchMe();
    // Role-based redirect is handled by the login page after login() resolves
  }, [fetchMe]);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
