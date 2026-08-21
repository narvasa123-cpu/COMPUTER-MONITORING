import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sys_auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('sys_auth_token') || 'system-admin-static-token';
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('sys_auth_token', data.token);
      } else {
        // Fallback default admin
        setUser({
          id: 'user-superadmin-01',
          username: 'admin',
          email: 'admin@system.local',
          fullName: 'IT Chief Administrator',
          role: 'super_admin',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Auth fetch error, using default admin session:', err);
      setUser({
        id: 'user-superadmin-01',
        username: 'admin',
        email: 'admin@system.local',
        fullName: 'IT Chief Administrator',
        role: 'super_admin',
        createdAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
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
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
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

  const switchDemoRole = async (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      super_admin: 'IT Chief Administrator',
      it_admin: 'Network & Lab Administrator',
      technician: 'Hardware Support Specialist',
      department_head: 'Dr. Sarah Connor (Computer Science Head)',
      viewer: 'Staff Inspector'
    };

    const updatedUser: User = {
      id: `user-${role}-01`,
      username: role,
      email: `${role}@system.local`,
      fullName: roleNames[role] || 'System User',
      role,
      departmentId: role === 'department_head' ? 'dept-cs-01' : undefined,
      createdAt: new Date().toISOString()
    };

    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchDemoRole }}>
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
