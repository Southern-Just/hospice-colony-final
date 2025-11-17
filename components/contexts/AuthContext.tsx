'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ExtendedUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  hospitalId?: string | null;
  hospitalName?: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getSessionUser = async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  };

  const refreshUser = async () => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      setUser(null);
      if (typeof window !== 'undefined') localStorage.removeItem('userData');
      return;
    }

    const cleaned = {
      ...sessionUser,
      hospitalId: sessionUser.hospitalId || null,
      hospitalName: sessionUser.hospitalName || null,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('userData', JSON.stringify(cleaned));
    }

    setUser(cleaned);
  };

  useEffect(() => {
    const load = async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
      if (stored) setUser(JSON.parse(stored));
      await refreshUser();
      setIsLoading(false);
    };
    load();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Invalid credentials');
        return false;
      }

      const cleaned = {
        ...data.user,
        hospitalId: data.user.hospitalId || null,
        hospitalName: data.user.hospitalName || null,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('userData', JSON.stringify(cleaned));
      }

      setUser(cleaned);
      return true;
    } catch {
      toast.error('Failed to sign in');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userData');
      }
      setUser(null);
      router.push('/sign-in');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
