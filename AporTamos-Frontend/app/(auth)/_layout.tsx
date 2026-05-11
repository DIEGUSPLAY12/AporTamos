/**
 * Authentication Stack Layout
 *
 * This layout manages the auth flow screens:
 * - Login: Email/password authentication
 * - Register: New user account creation
 * - Forgot Password: Password reset flow
 *
 * All screens in this stack are presented in a card style
 * to allow smooth navigation between auth flows.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        presentation: 'card',
      }}
    >
      {/* Login Screen - Default auth entry point */}
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />

      {/* Register Screen - New user registration */}
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
        }}
      />

      {/* Forgot Password Screen - Password reset */}
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Reset Password',
        }}
      />
    </Stack>
  );
}
