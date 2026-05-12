/**
 * Authentication Context for AporTamos
 *
 * Provides centralized authentication state management and methods
 * for the entire application. Manages user login, registration, logout,
 * and maintains authentication state across screens and navigation.
 *
 * Features:
 * - Centralized auth state (user, session, loading, error)
 * - Sign up with email/password
 * - Login with email/password
 * - Login with Google OAuth
 * - Logout functionality
 * - Session refresh
 * - Error handling with messages
 * - Loading states for UI feedback
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signInWithGoogle as supabaseSignInWithGoogle,
  signOut as supabaseSignOut,
  getSession as supabaseGetSession,
  getUser as supabaseGetUser,
  getSupabaseClient,
} from '@/services/supabase';

/**
 * Authentication context type definition
 */
interface AuthContextType {
  // State
  user: any | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;

  // Auth methods
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Utilities
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

/**
 * Create the authentication context
 * Default undefined - provider must be used
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 *
 * Wraps the application with authentication state management.
 * Should be placed at the root level or above all components that need auth.
 *
 * @example
 * export default function App() {
 *   return (
 *     <AuthProvider>
 *       <RootLayout />
 *     </AuthProvider>
 *   );
 * }
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize auth state on app startup
   * Check for existing session and restore it
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current session from Supabase
        const { session: currentSession, error: sessionError } = await supabaseGetSession();

        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError);
          setSession(null);
          setUser(null);
          return;
        }

        // If session exists, get user details
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Set up auth state listener for ongoing updates
          const supabase = getSupabaseClient();
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, newSession) => {
            console.log('[AuthContext] Auth event:', event);

            switch (event) {
              case 'SIGNED_IN':
              case 'TOKEN_REFRESHED':
              case 'USER_UPDATED':
                setSession(newSession);
                setUser(newSession?.user || null);
                break;

              case 'SIGNED_OUT':
                setSession(null);
                setUser(null);
                break;

              default:
                break;
            }
          });

          // Cleanup subscription on unmount
          return () => {
            subscription?.unsubscribe();
          };
        }
      } catch (err) {
        console.error('[AuthContext] Initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Sign up with email and password
   *
   * @param email - User email
   * @param password - User password
   * @param name - User display name
   *
   * @throws Error if signup fails
   */
  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { user: newUser, session: newSession, error: signupError } = await supabaseSignUp(
        email,
        password,
        name
      );

      if (signupError) {
        setError(signupError.message);
        throw signupError;
      }

      setUser(newUser);
      setSession(newSession);
      console.log('[AuthContext] Sign up successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      console.error('[AuthContext] Sign up error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with email and password
   *
   * @param email - User email
   * @param password - User password
   *
   * @throws Error if login fails
   */
  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { user: loginUser, session: loginSession, error: signinError } = await supabaseSignIn(
        email,
        password
      );

      if (signinError) {
        setError(signinError.message);
        throw signinError;
      }

      setUser(loginUser);
      setSession(loginSession);
      console.log('[AuthContext] Sign in successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      console.error('[AuthContext] Sign in error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with Google OAuth
   *
   * @param googleToken - Google OAuth ID token
   *
   * @throws Error if Google login fails
   */
  const handleSignInWithGoogle = async (googleToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { user: googleUser, session: googleSession, error: googleError } =
        await supabaseSignInWithGoogle(googleToken);

      if (googleError) {
        setError(googleError.message);
        throw googleError;
      }

      setUser(googleUser);
      setSession(googleSession);
      console.log('[AuthContext] Google sign in successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      console.error('[AuthContext] Google sign in error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out the current user
   *
   * @throws Error if logout fails
   */
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: signoutError } = await supabaseSignOut();

      if (signoutError) {
        setError(signoutError.message);
        throw signoutError;
      }

      setUser(null);
      setSession(null);
      console.log('[AuthContext] Sign out successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      console.error('[AuthContext] Sign out error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh the current session
   * Useful for updating auth state after backend operations
   */
  const handleRefreshSession = async () => {
    try {
      const { session: refreshedSession, error: refreshError } = await supabaseGetSession();

      if (refreshError) {
        console.error('[AuthContext] Session refresh error:', refreshError);
        return;
      }

      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Session refresh exception:', err);
    }
  };

  /**
   * Clear the current error message
   */
  const clearErrorMessage = () => {
    setError(null);
  };

  // Context value
  const value: AuthContextType = {
    // State
    user,
    session,
    isLoading,
    error,
    isLoggedIn: !!user && !!session,

    // Auth methods
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,

    // Utilities
    refreshSession: handleRefreshSession,
    clearError: clearErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use the authentication context
 *
 * Must be used inside AuthProvider
 *
 * @returns {AuthContextType} Authentication context value
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * function LoginScreen() {
 *   const { signIn, isLoading, error } = useAuth();
 *   const [email, setEmail] = useState('');
 *   const [password, setPassword] = useState('');
 *
 *   const handleLogin = async () => {
 *     try {
 *       await signIn(email, password);
 *     } catch (err) {
 *       console.error('Login failed:', err);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <TextInput
 *         placeholder="Email"
 *         value={email}
 *         onChangeText={setEmail}
 *       />
 *       <TextInput
 *         placeholder="Password"
 *         value={password}
 *         onChangeText={setPassword}
 *         secureTextEntry
 *       />
 *       <Button
 *         title={isLoading ? 'Logging in...' : 'Login'}
 *         onPress={handleLogin}
 *         disabled={isLoading}
 *       />
 *       {error && <Text style={{ color: 'red' }}>{error}</Text>}
 *     </View>
 *   );
 * }
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
