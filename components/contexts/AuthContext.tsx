'use client';

import  { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';

interface ExtendedUser extends Partial<User> {
  hospitalId?: string | null;
  hospitalName?: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: (userId: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrCreateHospital = async (hospitalId: string | null, hospitalName?: string | null) => {
    try {
      if (!hospitalId && hospitalName) {
        const createRes = await fetch('/api/hospitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: hospitalName }),
        });
        if (!createRes.ok) return null;
        const data = await createRes.json();
        return { id: data.hospital.id, name: data.hospital.name };
      }
      if (hospitalId) {
        const res = await fetch(`/api/hospitals/${hospitalId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return { id: data.hospital.id, name: data.hospital.name };
      }
      return null;
    } catch {
      return null;
    }
  };

  const refreshUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) {
        toast.error('Failed to refresh user data.');
        return;
      }
      const { user: refreshedUser } = await res.json();
      let hospitalId = refreshedUser.hospitalId;
      let hospitalName = refreshedUser.hospitalName;
      const hospitalData = await fetchOrCreateHospital(hospitalId, hospitalName);
      if (hospitalData) {
        hospitalId = hospitalData.id;
        hospitalName = hospitalData.name;
      }
      const userToStore = { ...refreshedUser, hospitalName, hospitalId: hospitalId || null };
      if (typeof window !== 'undefined') {
        localStorage.setItem('userData', JSON.stringify(userToStore));
      }
      setUser(userToStore);
    } catch {
      toast.error('Error refreshing profile data.');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          let hospitalId = parsedUser.hospitalId;
          let hospitalName = parsedUser.hospitalName;
          const hospitalData = await fetchOrCreateHospital(hospitalId, hospitalName);
          if (hospitalData) {
            hospitalId = hospitalData.id;
            hospitalName = hospitalData.name;
          }
          setUser({ ...parsedUser, hospitalName, hospitalId: hospitalId || null });
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      const { token, user: returnedUser } = data;
      let hospitalId = returnedUser.hospitalId;
      let hospitalName = returnedUser.hospitalName;
      const hospitalData = await fetchOrCreateHospital(hospitalId, hospitalName);
      if (hospitalData) {
        hospitalId = hospitalData.id;
        hospitalName = hospitalData.name;
      }
      const userToStore = { ...returnedUser, hospitalName, hospitalId: hospitalId || null };
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userToStore));
      }
      setUser(userToStore);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      setUser(null);
      router.push('/sign-in'); // redirect to sign-in
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    refreshUser,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
