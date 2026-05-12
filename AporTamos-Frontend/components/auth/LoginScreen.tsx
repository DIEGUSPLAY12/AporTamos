/**
 * LoginScreen Component for AporTamos
 *
 * Provides user authentication interface with:
 * - Email and password input fields
 * - Email/password login button
 * - Google OAuth login button
 * - Error message display
 * - Loading state management
 * - Navigation to registration screen
 * - Forgot password link (future enhancement)
 *
 * Features:
 * - Form validation for email and password
 * - Error messages with dismiss button
 * - Loading indicator during login
 * - Responsive design for mobile/tablet/web
 * - Dark mode support
 * - Accessibility labels
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLogin, useGoogleAuth, useAuthError } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * Validation helper function
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * LoginScreen Component
 *
 * Main authentication screen for user login.
 * Handles email/password and Google OAuth authentication.
 *
 * @component
 * @example
 * import LoginScreen from '@/components/auth/LoginScreen';
 * <LoginScreen />
 */
export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Auth hooks
  const { login, isLoading } = useLogin();
  const { googleLogin, isLoading: isGoogleLoading } = useGoogleAuth();
  const { error: contextError, clearError } = useAuthError();

  // Local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Combine errors from hook and local state
  const error = localError || contextError;

  /**
   * Handle email/password login
   */
  const handleLogin = useCallback(async () => {
    try {
      // Clear previous errors
      setLocalError(null);
      clearError();

      // Validate inputs
      if (!email.trim()) {
        setLocalError('Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setLocalError('Please enter a valid email address');
        return;
      }

      if (!password) {
        setLocalError('Password is required');
        return;
      }

      if (!validatePassword(password)) {
        setLocalError('Password must be at least 8 characters');
        return;
      }

      // Attempt login
      await login(email, password);
      // Navigation handled by auth context and root layout
    } catch (err) {
      // Error displayed from hook
      console.error('[LoginScreen] Login error:', err);
    }
  }, [email, password, login, clearError]);

  /**
   * Handle Google OAuth login
   * TODO: Integrate with Google Sign-In library (expo-google-sign-in or similar)
   */
  const handleGoogleLogin = useCallback(async () => {
    try {
      setLocalError(null);
      clearError();

      // TODO: Get Google token from Google Sign-In library
      // For now, show placeholder message
      setLocalError('Google OAuth integration coming soon. Please use email/password for now.');

      // When Google Sign-In is integrated:
      // const { user, idToken } = await GoogleSignIn.signIn();
      // await googleLogin(idToken);
    } catch (err) {
      console.error('[LoginScreen] Google login error:', err);
      setLocalError('Google login failed. Please try again.');
    }
  }, [googleLogin, clearError]);

  /**
   * Navigate to registration screen
   */
  const handleNavigateToRegister = useCallback(() => {
    router.push('/register');
  }, [router]);

  /**
   * Navigate to forgot password screen
   */
  const handleForgotPassword = useCallback(() => {
    router.push('/forgot-password');
  }, [router]);

  const isLoggingIn = isLoading || isGoogleLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in to your AporTamos account
            </ThemedText>
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: '#fee2e2' }]}>
              <ThemedText style={[styles.errorText, { color: '#dc2626' }]}>
                {error}
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setLocalError(null);
                  clearError();
                }}
                style={styles.errorDismiss}
              >
                <Text style={{ color: '#dc2626', fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                  },
                ]}
                placeholder="user@example.com"
                placeholderTextColor={colors.icon}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoggingIn}
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email input"
                accessibilityHint="Enter your email address to log in"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={isLoggingIn}
                >
                  <ThemedText style={styles.forgotLink}>
                    Forgot?
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      color: colors.text,
                      borderColor: colors.icon,
                      backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                    },
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isLoggingIn}
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your password to log in"
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                >
                  <ThemedText style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: '#0ea5e9', opacity: isLoggingIn ? 0.6 : 1 },
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn}
              accessibilityRole="button"
              accessibilityLabel="Login button"
              accessibilityHint="Sign in with your email and password"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.loginButtonText}>
                  Sign In
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.icon }]} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={[styles.divider, { backgroundColor: colors.icon }]} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  borderColor: colors.icon,
                  opacity: isGoogleLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
              accessibilityRole="button"
              accessibilityLabel="Google Sign In button"
              accessibilityHint="Sign in with your Google account"
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>🔵</Text>
                  <ThemedText style={styles.googleButtonText}>
                    Sign in with Google
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer - Register Link */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Don't have an account?{' '}
            </ThemedText>
            <TouchableOpacity
              onPress={handleNavigateToRegister}
              disabled={isLoggingIn}
            >
              <ThemedText style={styles.registerLink}>
                Sign Up
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },

  header: {
    marginBottom: 32,
    marginTop: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },

  errorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  errorDismiss: {
    padding: 4,
  },

  form: {
    marginBottom: 32,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#d4d4d4',
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 0,
  },

  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  showPasswordText: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '500',
  },

  forgotLink: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '500',
  },

  loginButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  divider: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    opacity: 0.6,
  },

  googleButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  googleIcon: {
    fontSize: 18,
  },

  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 14,
  },

  registerLink: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
});
