/**
 * Root Navigation Layout for AporTamos Mobile Application
 *
 * This component provides:
 * - Conditional authentication flow (auth screens vs app screens)
 * - Supabase session management with automatic token refresh
 * - Theme provider integration (dark/light mode)
 * - Root-level error boundaries and status bar
 * - Smooth transitions between auth and app states
 *
 * Architecture:
 * - When user is NOT authenticated: Show (auth) stack with login/register
 * - When user IS authenticated: Show (tabs) stack with app navigation
 * - Loading state: Show splash screen while checking auth
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSupabaseClient } from '@/services/supabase';

/**
 * Splash screen component shown while checking authentication state
 * This prevents flash of unstyled content (FOUC) during auth state check
 */
function SplashScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

export const unstable_settings = {
  // Use (auth) as the initial route if user is not authenticated
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  /**
   * Initialize Supabase session check and auth state listener
   *
   * On mount:
   * 1. Get Supabase client instance
   * 2. Check if current session exists (user already logged in)
   * 3. Set up auth state change listener for ongoing monitoring
   * 4. Listen to token refresh events
   * 5. Handle logout events
   *
   * Cleanup:
   * - Remove auth listener on unmount to prevent memory leaks
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const supabase = getSupabaseClient();

        // Check if user has existing session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[RootLayout] Session check error:', sessionError);
          setIsLoggedIn(false);
          return;
        }

        // Set login state based on session
        setIsLoggedIn(!!session);

        // Set up listener for auth state changes
        // This handles:
        // - SIGNED_IN: User just logged in or registered
        // - SIGNED_OUT: User logged out
        // - TOKEN_REFRESHED: New access token obtained
        // - USER_UPDATED: User profile changed (Supabase auth)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log(`[RootLayout] Auth event: ${event}`, {
            isAuthenticated: !!currentSession,
            expiresAt: currentSession?.expires_at,
          });

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // User logged in or token was refreshed
            setIsLoggedIn(!!currentSession);
          } else if (event === 'SIGNED_OUT') {
            // User logged out explicitly
            setIsLoggedIn(false);
          } else if (event === 'USER_UPDATED') {
            // User profile/email changed, keep logged in
            setIsLoggedIn(!!currentSession);
          }
        });

        // Cleanup subscription on unmount
        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('[RootLayout] Auth initialization failed:', error);
        setIsLoggedIn(false);
      }
    };

    initializeAuth();
  }, []);

  // Show splash screen while checking auth state
  if (isLoggedIn === null) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {!isLoggedIn ? (
          /**
           * Authentication Stack
           * Shown when user is NOT logged in
           *
           * Screens:
           * - login: Email/password login form
           * - register: User registration form
           * - forgot-password: Password reset flow (future)
           *
           * Features:
           * - No back button between screens (modal stack)
           * - Prevents returning to login after logout
           * - Smooth transitions between auth screens
           */
          <Stack.Group screenOptions={{ presentation: 'card', animationEnabled: true }}>
            <Stack.Screen
              name="(auth)"
              options={{
                headerShown: false,
              }}
            />
          </Stack.Group>
        ) : (
          /**
           * App Stack
           * Shown when user IS logged in
           *
           * Structure:
           * - (tabs): Main tabbed navigation (households, tasks, chat, profile)
           * - modal: Modal screen for overlays (if needed)
           * - error: Error screen for runtime errors (if needed)
           *
           * Features:
           * - Full app navigation available
           * - Tab-based bottom navigation
           * - Modal overlays for secondary flows
           */
          <Stack.Group>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                title: 'Modal',
              }}
            />
          </Stack.Group>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
