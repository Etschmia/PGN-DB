import { useState, useEffect, useCallback } from 'react';
import type { AuthUser, StorageInfo } from '../types';
import * as authService from '../services/authService';
import { getStorageInfo } from '../services/serverStorageService';
import { setStorageMode } from '../services/storageService';

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  storageInfo: StorageInfo | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<void>;
  refreshStorageInfo: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  const isAuthenticated = user !== null;

  // Session beim App-Start prüfen
  useEffect(() => {
    (async () => {
      try {
        const result = await authService.getMe();
        if (result?.user) {
          setUser(result.user);
          setStorageMode(true);
        }
      } catch {
        // Nicht eingeloggt
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Storage-Info laden wenn eingeloggt
  useEffect(() => {
    if (isAuthenticated) {
      refreshStorageInfo();
    } else {
      setStorageInfo(null);
    }
  }, [isAuthenticated]);

  const refreshStorageInfo = useCallback(async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('[useAuth] Fehler beim Laden der Storage-Info:', err);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setUser(result.user);
    setStorageMode(true);
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<string> => {
    const result = await authService.register(email, password);
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStorageMode(false);
    setStorageInfo(null);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    const result = await authService.forgotPassword(email);
    return result.message;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const result = await authService.resetPassword(token, password);
    setUser(result.user);
    setStorageMode(true);
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    storageInfo,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshStorageInfo,
  };
}
