import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sys_auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // All console APIs are authenticated.  Keeping this at the boundary prevents
  // individual screens from accidentally making an anonymous protected call.
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === 'string' ? input : input.toString();
      const isConsoleApi = url.startsWith('/api/') && !url.startsWith('/api/auth/') && !url.startsWith('/api/agent/');
      if (!isConsoleApi) return nativeFetch(input, init);
      const activeToken = localStorage.getItem('sys_auth_token');
      const headers = new Headers(init.headers || {});
      if (activeToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${activeToken}`);
      return nativeFetch(input, { ...init, headers });
    };
    return () => { window.fetch = nativeFetch; };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('sys_auth_token');
      if (!storedToken) {
        return;
      }
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('sys_auth_token', data.token);
      } else {
        localStorage.removeItem('sys_auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Unable to restore the current session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('sys_auth_token', data.token);
        return { success: true };
      }
      if (res.status === 401) {
        return { success: false, error: 'The username or password is incorrect.' };
      }
      return { success: false, error: 'The monitoring server is unavailable. Check the backend deployment and try again.' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Unable to connect to the monitoring server. Check your network connection and backend deployment.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('sys_auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
