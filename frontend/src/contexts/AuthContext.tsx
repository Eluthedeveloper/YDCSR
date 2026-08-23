import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
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
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/profile')
        .then(({ data }) => {
          if (data.success) {
            setUser(data.data);
          } else {
            localStorage.clear();
          }
        })
        .catch(() => {
          localStorage.clear();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { username, password });
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.clear();
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
