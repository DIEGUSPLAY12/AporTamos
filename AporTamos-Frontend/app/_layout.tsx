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
import { AuthProvider, useAuth } from '@/context/AuthContext';

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

/**
 * Root Stack Layout Component
 * Renders different stacks based on authentication state
 * This component is wrapped by AuthProvider via RootLayout
 */
function RootStackLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, isLoading } = useAuth();

  // Show splash screen while checking auth state
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {!isLoggedIn ? (
        // Authentication Stack - shown when user is NOT logged in
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="(auth)"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      ) : (
        // App Stack - shown when user IS logged in
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
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
        </Stack>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

/**
 * Splash screen component shown while checking authentication state
 * This prevents flash of unstyled content (FOUC) during auth state check
 */

export const unstable_settings = {
  // Use (auth) as the initial route if user is not authenticated
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStackLayout />
    </AuthProvider>
  );
}
