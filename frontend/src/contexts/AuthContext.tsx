import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser } from '../types';
import toast from 'react-hot-toast';
import { authService } from '@/src/features/auth/services/authService';
import { clearAuthToken, getAuthToken } from '@/src/lib/api';
import { connectAccessSocket } from '@/src/services/realtimeService';
import { userCan, type Capability } from '@/src/lib/permissions';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ requiresMfa?: boolean; mfaToken?: string }>;
  loginMfa: (mfaToken: string, code: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<AppUser>;
  refreshUser: () => Promise<AppUser | null>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isIT: boolean;
  isHR: boolean;
  can: (capability: Capability) => boolean;
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
    capabilities: Array.isArray(apiUser.capabilities) ? apiUser.capabilities : [],
    capabilityOverrides: Array.isArray(apiUser.capabilityOverrides) ? apiUser.capabilityOverrides : null,
    mfaEnabled: apiUser.mfaEnabled || false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const apiUser = await authService.me();
      const nextUser = toAppUser(apiUser);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      clearAuthToken();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    async function bootstrapSession() {
      await refreshUser();
      setLoading(false);
    }

    bootstrapSession();
  }, [refreshUser]);

  useEffect(() => {
    function syncCurrentUser() {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    }

    window.addEventListener('focus', syncCurrentUser);
    document.addEventListener('visibilitychange', syncCurrentUser);
    return () => {
      window.removeEventListener('focus', syncCurrentUser);
      document.removeEventListener('visibilitychange', syncCurrentUser);
    };
  }, [refreshUser]);



  useEffect(() => {
    if (!user?.uid) return undefined;

    return connectAccessSocket({
      onAccessUpdated: ({ user: apiUser }: { user?: any }) => {
        if (!apiUser) return;

        const nextUser = toAppUser(apiUser);
        if (nextUser.status !== 'active') {
          clearAuthToken();
          setUser(null);
          toast.error('Your account access changed. Please contact the Super Admin.');
          return;
        }

        setUser(nextUser);
        toast.success('Your account access was updated.');
      },
      onAccessRevoked: () => {
        clearAuthToken();
        setUser(null);
        toast.error('Your account access was revoked.');
      },
    });
  }, [user?.uid]);

  const login = async (email: string, pass: string) => {
    try {
      const apiUser = await authService.login(email, pass);
      if (apiUser.requiresMfa) {
        return { requiresMfa: true, mfaToken: apiUser.mfaToken };
      }
      setUser(toAppUser(apiUser));
      toast.success('Successfully logged in');
      return { requiresMfa: false };
    } catch (error: any) {
      const msg = error.message || 'Login failed';
      if (!msg.toLowerCase().includes('pending') && !msg.toLowerCase().includes('disabled')) {
        toast.error(msg);
      }
      throw error;
    }
  };

  const loginMfa = async (mfaToken: string, code: string) => {
    try {
      const apiUser = await authService.loginMfa(mfaToken, code);
      setUser(toAppUser(apiUser));
      toast.success('Successfully logged in');
    } catch (error: any) {
      toast.error(error.message || 'Invalid MFA code');
      throw error;
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      const apiUser = await authService.register(input);
      // Note: registration does not affect the current session. The caller is
      // responsible for success messaging (the flow differs by context).
      return toAppUser(apiUser);
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    toast.success('Logged out');
  };

  const value = React.useMemo(() => ({
    user,
    loading,
    login,
    loginMfa,
    register,
    refreshUser,
    logout,
    isAdmin: user?.role === 'super_admin' || user?.role === 'admin',
    isIT: user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'it_admin',
    isHR: user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin',
    can: (capability: Capability) => userCan(user, capability),
  }), [user, loading, refreshUser]);

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
