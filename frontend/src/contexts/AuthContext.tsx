import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { clearSession, getCsrfToken, setCsrfToken } from '../services/api';
import { UserRole, LoginResponse } from '../types';

interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  phone: string;
  email: string | null;
  regionalStateId?: string | null;
  regionalStateName?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The access/refresh cookies are httpOnly, so JS cannot read them to detect
    // a session. The non-httpOnly csrf_token cookie only exists while a session
    // is active, so its presence tells us whether to try restoring the session.
    if (!getCsrfToken()) {
      setLoading(false);
      return;
    }

    api.get('/auth/profile')
      .then(({ data }) => {
        if (data.success) {
          setUser(data.data);
        } else {
          clearSession();
          setUser(null);
        }
      })
      .catch((error) => {
        // Only drop the session on explicit auth rejection. Transient
        // failures (backend restarting, network drop) keep the cookie
        // so a later request can still recover via refresh.
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) {
          clearSession();
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { username, password });
    if (!data.success) {
      throw new Error('Login failed');
    }
    setCsrfToken(data.data.csrfToken);
    setUser(data.data.user);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    clearSession();
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (...roles: UserRole[]) => user !== null && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}