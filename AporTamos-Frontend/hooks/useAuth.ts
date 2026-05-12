/**
 * Authentication Hooks for AporTamos
 *
 * Provides custom hooks for authentication state management and operations.
 * These hooks wrap the AuthContext and Supabase auth methods to provide
 * easier-to-use abstractions for authentication across components.
 *
 * Hooks:
 * - useAuthState: Get current auth state (user, session, isLoggedIn)
 * - useAuthLoading: Get loading state for async operations
 * - useAuthError: Get and clear auth errors
 * - useLogin: Handle email/password login
 * - useRegister: Handle user registration
 * - useLogout: Handle logout
 * - useGoogleAuth: Handle Google OAuth login
 * - useAuthRefresh: Refresh session or recheck auth state
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Get current authentication state
 *
 * @returns Object with user, session, and isLoggedIn status
 *
 * @example
 * const { user, session, isLoggedIn } = useAuthState();
 * if (isLoggedIn) {
 *   console.log('User is logged in as:', user.email);
 * }
 */
export function useAuthState() {
  const { user, session, isLoggedIn } = useAuth();

  return {
    user,
    session,
    isLoggedIn,
    userId: user?.id,
    userEmail: user?.email,
  };
}

/**
 * Get loading state for async auth operations
 *
 * @returns Boolean indicating if auth operation is in progress
 *
 * @example
 * const isLoading = useAuthLoading();
 * <Button disabled={isLoading}>{isLoading ? 'Loading...' : 'Login'}</Button>
 */
export function useAuthLoading() {
  const { isLoading } = useAuth();
  return isLoading;
}

/**
 * Get and manage authentication errors
 *
 * @returns Object with error message and clearError function
 *
 * @example
 * const { error, clearError } = useAuthError();
 * return (
 *   <>
 *     {error && (
 *       <View>
 *         <Text style={{ color: 'red' }}>{error}</Text>
 *         <Button title="Dismiss" onPress={clearError} />
 *       </View>
 *     )}
 *   </>
 * );
 */
export function useAuthError() {
  const { error, clearError } = useAuth();

  return {
    error,
    clearError,
    hasError: !!error,
  };
}

/**
 * Handle user login with email and password
 *
 * @returns Object with login function and state
 *
 * @example
 * const { login, isLoading, error } = useLogin();
 * const handleLogin = async () => {
 *   try {
 *     await login('user@example.com', 'password123');
 *     console.log('Login successful');
 *   } catch (err) {
 *     console.error('Login failed:', err);
 *   }
 * };
 */
export function useLogin() {
  const { signIn, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLocalError(null);
        await signIn(email, password);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setLocalError(errorMessage);
        throw err;
      }
    },
    [signIn]
  );

  return {
    login,
    isLoading,
    error: error || localError,
  };
}

/**
 * Handle user registration with email, password, and name
 *
 * @returns Object with register function and state
 *
 * @example
 * const { register, isLoading, error } = useRegister();
 * const handleRegister = async () => {
 *   try {
 *     await register('user@example.com', 'password123', 'John Doe');
 *     console.log('Registration successful');
 *   } catch (err) {
 *     console.error('Registration failed:', err);
 *   }
 * };
 */
export function useRegister() {
  const { signUp, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setLocalError(null);
        await signUp(email, password, name);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setLocalError(errorMessage);
        throw err;
      }
    },
    [signUp]
  );

  return {
    register,
    isLoading,
    error: error || localError,
  };
}

/**
 * Handle user logout
 *
 * @returns Object with logout function and state
 *
 * @example
 * const { logout, isLoading } = useLogout();
 * <Button
 *   title={isLoading ? 'Logging out...' : 'Logout'}
 *   onPress={logout}
 *   disabled={isLoading}
 * />
 */
export function useLogout() {
  const { signOut, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    try {
      setLocalError(null);
      await signOut();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setLocalError(errorMessage);
      throw err;
    }
  }, [signOut]);

  return {
    logout,
    isLoading,
    error: error || localError,
  };
}

/**
 * Handle Google OAuth login
 *
 * @returns Object with googleLogin function and state
 *
 * @example
 * const { googleLogin, isLoading, error } = useGoogleAuth();
 * const handleGoogleLogin = async () => {
 *   const token = await getGoogleToken(); // From Google Sign-In library
 *   await googleLogin(token);
 * };
 */
export function useGoogleAuth() {
  const { signInWithGoogle, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const googleLogin = useCallback(
    async (googleToken: string) => {
      try {
        setLocalError(null);
        await signInWithGoogle(googleToken);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Google login failed';
        setLocalError(errorMessage);
        throw err;
      }
    },
    [signInWithGoogle]
  );

  return {
    googleLogin,
    isLoading,
    error: error || localError,
  };
}

/**
 * Refresh authentication state
 *
 * Useful after navigation, route changes, or when auth state might be stale.
 * This will recheck the session and update auth state.
 *
 * @returns Object with refresh function and state
 *
 * @example
 * const { refreshAuth, isLoading } = useAuthRefresh();
 * useFocusEffect(
 *   useCallback(() => {
 *     refreshAuth();
 *   }, [refreshAuth])
 * );
 */
export function useAuthRefresh() {
  const { refreshSession, isLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshSession();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshSession]);

  return {
    refreshAuth: refresh,
    isLoading: isLoading || isRefreshing,
  };
}

/**
 * Check if user is authenticated
 *
 * Shortcut hook for simple "is user logged in" checks.
 *
 * @returns Boolean indicating if user is logged in
 *
 * @example
 * const isLoggedIn = useIsLoggedIn();
 * return isLoggedIn ? <HomeScreen /> : <LoginScreen />;
 */
export function useIsLoggedIn() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn;
}

/**
 * Get current user object
 *
 * Shortcut hook to access current user without other auth state.
 *
 * @returns Current user object or null if not authenticated
 *
 * @example
 * const user = useCurrentUser();
 * if (user) {
 *   console.log('User email:', user.email);
 * }
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

/**
 * Get current user ID
 *
 * Shortcut hook for getting just the user ID.
 * Useful for API calls that require the user ID.
 *
 * @returns Current user ID or null if not authenticated
 *
 * @example
 * const userId = useCurrentUserId();
 * if (userId) {
 *   await fetchUserHouseholds(userId);
 * }
 */
export function useCurrentUserId() {
  const { user } = useAuth();
  return user?.id || null;
}

/**
 * Check if an auth operation is in progress
 *
 * Returns true if any auth operation (login, register, logout) is loading.
 * Useful for disabling form inputs during submission.
 *
 * @returns Boolean indicating if auth operation is in progress
 *
 * @example
 * const isAuthLoading = useIsAuthLoading();
 * <Button disabled={isAuthLoading} onPress={handleSubmit} />
 */
export function useIsAuthLoading() {
  const { isLoading } = useAuth();
  return isLoading;
}

/**
 * Composite hook for authentication in login/register forms
 *
 * Combines all necessary auth state and methods for authentication screens.
 *
 * @returns Object with all auth state and methods for forms
 *
 * @example
 * function LoginScreen() {
 *   const { isLoading, error, clearError, login } = useAuthForm();
 *   const handleLogin = async () => {
 *     try {
 *       await login(email, password);
 *     } catch (err) {
 *       // Error handled by hook
 *     }
 *   };
 *   return (
 *     <View>
 *       {error && <ErrorBanner message={error} onDismiss={clearError} />}
 *       <Button disabled={isLoading} onPress={handleLogin} />
 *     </View>
 *   );
 * }
 */
export function useAuthForm() {
  const { isLoading, error, clearError, signIn, signUp, signInWithGoogle } = useAuth();

  return {
    // State
    isLoading,
    error,
    hasError: !!error,

    // Methods
    login: signIn,
    register: signUp,
    googleLogin: signInWithGoogle,
    clearError,
  };
}
