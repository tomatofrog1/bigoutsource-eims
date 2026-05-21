import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppUser } from '../types';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { clearAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isIT: boolean;
  isHR: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  department: string;
  site: string;
}

function toAppUser(apiUser: any): AppUser {
  return {
    uid: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.fullName,
    role: apiUser.role,
    status: apiUser.status,
    department: apiUser.department || 'Unassigned',
    site: apiUser.site || 'Unassigned',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrapSession() {
      const token = getAuthToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const apiUser = await authService.me();
        setUser(toAppUser(apiUser));
      } catch (error) {
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrapSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const apiUser = await authService.login(email, pass);
      setUser(toAppUser(apiUser));
      toast.success('Successfully logged in');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setLoading(true);
    try {
      await authService.register(input);
      toast.success('Account request submitted for approval');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    toast.success('Logged out');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'super_admin' || user?.role === 'admin',
    isIT: user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'it_admin',
    isHR: user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
