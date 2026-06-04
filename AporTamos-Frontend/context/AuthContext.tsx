import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUnauthorizedHandler } from '@/services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { access_token: string } | null;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  updateProfile: (fields: { name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function apiAuth(endpoint: string, body: object): Promise<{ access_token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || `Error ${res.status}`);
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register 401 handler so api.ts can sign us out when token expires
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  // Restore session from storage on startup, validating the token with the backend.
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        // No stored session → show login.
        if (!storedToken || !storedUser) return;

        // Validate the token. A 401 means it's invalid/expired → sign out.
        // On timeout/network error (e.g. Render cold start) trust the stored
        // session optimistically; the 401 interceptor will catch it later.
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            signal: controller.signal,
          });
          clearTimeout(t);

          if (res.ok) {
            const me = await res.json();
            setToken(storedToken);
            setUser(me);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(me)); // refresh stale data
          } else if (res.status === 401) {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]); // invalid → login
          } else {
            // Unexpected status → trust stored session
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        } catch {
          // Network/timeout → optimistic restore (offline-friendly)
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // start unauthenticated if storage fails
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function persist(accessToken: string, authUser: AuthUser) {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, accessToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser)),
    ]);
    setToken(accessToken);
    setUser(authUser);
  }

  async function handleSignUp(email: string, password: string, name: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { access_token, user: u } = await apiAuth('/auth/register', { email, password, name });
      await persist(access_token, u);
    } catch (err: any) {
      const msg = err.message || 'Error al registrarse';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { access_token, user: u } = await apiAuth('/auth/login', { email, password });
      await persist(access_token, u);
    } catch (err: any) {
      const msg = err.message || 'Credenciales incorrectas';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignInWithGoogle(idToken: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { access_token, user: u } = await apiAuth('/auth/google-login', { google_token: idToken });
      await persist(access_token, u);
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión con Google';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshSession() {
    // Re-read from storage in case another tab updated it
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {}
  }

  async function handleUpdateAvatar(avatarUrl: string) {
    if (!token || !user) return;
    const res = await fetch(`${API_BASE}/users/me/avatar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || 'No se pudo actualizar el avatar');
    }
    const updated = { ...user, avatar_url: avatarUrl };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  async function handleUpdateProfile(fields: { name?: string; email?: string }) {
    if (!token || !user) return;
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || 'No se pudo actualizar el perfil');
    const updated = { ...user, name: data.name ?? user.name, email: data.email ?? user.email };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    if (!token) return;
    const res = await fetch(`${API_BASE}/users/me/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || 'No se pudo cambiar la contraseña');
  }

  const value: AuthContextType = {
    user,
    session: token ? { access_token: token } : null,
    isLoading,
    error,
    isLoggedIn: !!user && !!token,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshSession: handleRefreshSession,
    updateAvatar: handleUpdateAvatar,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
