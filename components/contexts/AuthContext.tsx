'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../../lib/database/schema';

interface ExtendedUser extends Partial<User> {
  hospitalName?: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;

        if (token && userData) {
          const res = await fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const session = await res.json();
            let parsedUser = JSON.parse(userData);
            // handle both hospitalId and hospital_id shapes
            const hospitalId = parsedUser.hospitalId ?? parsedUser.hospital_id ?? parsedUser.hospital?.id;
            let hospital = null;
            if (hospitalId) {
              const hospitalRes = await fetch(`/api/hospitals/${hospitalId}`);
              hospital = hospitalRes.ok ? await hospitalRes.json() : null;
            }

            setUser({
              ...parsedUser,
              hospitalName: hospital?.name || null,
            });
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setUser(null);
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

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const { token, user: returnedUser } = data;
      const hospitalId = returnedUser?.hospitalId ?? returnedUser?.hospital_id ?? returnedUser?.hospital?.id;
      let hospital = null;
      if (hospitalId) {
        const hospitalRes = await fetch(`/api/hospitals/${hospitalId}`);
        hospital = hospitalRes.ok ? await hospitalRes.json() : null;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(returnedUser));
      }

      setUser({
        ...returnedUser,
        hospitalName: hospital?.name || null,
      });

      return true;
    } catch (error) {
      console.error('sign in failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
}
