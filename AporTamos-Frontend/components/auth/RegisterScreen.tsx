/**
 * RegisterScreen Component for AporTamos
 *
 * Provides user registration interface with:
 * - Name input field
 * - Email input field
 * - Password input field (secure, masked)
 * - Confirm password input field
 * - Form validation (email format, password strength, password match)
 * - Registration button with loading state
 * - Error message display
 * - Google OAuth registration option
 * - Navigation link to login screen
 * - Password strength indicator
 *
 * Features:
 * - Comprehensive form validation
 * - Password strength requirements display
 * - Confirm password matching validation
 * - Error messages with dismiss button
 * - Loading indicator during registration
 * - Responsive design for mobile/tablet/web
 * - Dark mode support
 * - Accessibility labels
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegister, useGoogleAuth, useAuthError } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * Validation helper functions
 */
function validateName(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 100;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): {
  isValid: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  let isValid = true;

  if (password.length < 8) {
    feedback.push('At least 8 characters');
    isValid = false;
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('One uppercase letter');
    isValid = false;
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('One lowercase letter');
    isValid = false;
  }
  if (!/\d/.test(password)) {
    feedback.push('One number');
    isValid = false;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('One special character');
    isValid = false;
  }

  return { isValid, feedback };
}

function getPasswordStrength(password: string): {
  level: 'weak' | 'fair' | 'good' | 'strong';
  percentage: number;
  color: string;
} {
  if (!password) return { level: 'weak', percentage: 0, color: '#ef4444' };

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  if (strength <= 2) return { level: 'weak', percentage: 25, color: '#ef4444' };
  if (strength <= 3) return { level: 'fair', percentage: 50, color: '#f97316' };
  if (strength <= 4) return { level: 'good', percentage: 75, color: '#eab308' };
  return { level: 'strong', percentage: 100, color: '#22c55e' };
}

/**
 * RegisterScreen Component
 *
 * Main registration screen for new user accounts.
 * Handles email/password registration and Google OAuth sign-up.
 *
 * @component
 * @example
 * import RegisterScreen from '@/components/auth/RegisterScreen';
 * <RegisterScreen />
 */
export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Auth hooks
  const { register, isLoading } = useRegister();
  const { googleLogin, isLoading: isGoogleLoading } = useGoogleAuth();
  const { error: contextError, clearError } = useAuthError();

  // Local state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Combine errors
  const error = localError || contextError;

  // Calculate password strength
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  // Validate password
  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  // Check if password matches
  const passwordsMatch = password === confirmPassword && password.length > 0;

  /**
   * Handle registration
   */
  const handleRegister = useCallback(async () => {
    try {
      // Clear previous errors
      setLocalError(null);
      clearError();

      // Validate name
      if (!name.trim()) {
        setLocalError('Name is required');
        return;
      }

      if (!validateName(name)) {
        setLocalError('Name must be between 1 and 100 characters');
        return;
      }

      // Validate email
      if (!email.trim()) {
        setLocalError('Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setLocalError('Please enter a valid email address');
        return;
      }

      // Validate password
      if (!password) {
        setLocalError('Password is required');
        return;
      }

      if (!passwordValidation.isValid) {
        setLocalError(
          `Password must have: ${passwordValidation.feedback.join(', ')}`
        );
        return;
      }

      // Validate confirm password
      if (!confirmPassword) {
        setLocalError('Please confirm your password');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }

      // Validate terms acceptance
      if (!agreeToTerms) {
        setLocalError('You must agree to the terms and conditions');
        return;
      }

      // Attempt registration
      await register(email, password, name);
      // Navigation handled by auth context and root layout
    } catch (err) {
      // Error displayed from hook
      console.error('[RegisterScreen] Registration error:', err);
    }
  }, [name, email, password, confirmPassword, agreeToTerms, register, clearError, passwordValidation]);

  /**
   * Handle Google OAuth registration
   */
  const handleGoogleRegister = useCallback(async () => {
    try {
      setLocalError(null);
      clearError();

      // Show placeholder message
      setLocalError('Google OAuth integration coming soon. Please use email/password for now.');

      // When Google Sign-In is integrated:
      // const { user, idToken } = await GoogleSignIn.signIn();
      // await googleLogin(idToken);
    } catch (err) {
      console.error('[RegisterScreen] Google registration error:', err);
      setLocalError('Google registration failed. Please try again.');
    }
  }, [googleLogin, clearError]);

  /**
   * Navigate to login screen
   */
  const handleNavigateToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const isRegistering = isLoading || isGoogleLoading;

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
        <ThemedView style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Join AporTamos to manage household tasks
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
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                  },
                ]}
                placeholder="John Doe"
                placeholderTextColor={colors.icon}
                autoCapitalize="words"
                autoComplete="name"
                editable={!isRegistering}
                value={name}
                onChangeText={setName}
                accessibilityLabel="Full name input"
                accessibilityHint="Enter your full name"
              />
            </View>

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
                editable={!isRegistering}
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email input"
                accessibilityHint="Enter your email address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
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
                  placeholder="Enter a strong password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isRegistering}
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter a password with uppercase, lowercase, number, and special character"
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isRegistering}
                >
                  <ThemedText style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {password && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${passwordStrength.percentage}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.strengthLabel,
                      { color: passwordStrength.color },
                    ]}
                  >
                    Strength: {passwordStrength.level}
                  </ThemedText>
                </View>
              )}

              {/* Password Requirements */}
              {password && !passwordValidation.isValid && (
                <View style={styles.requirementsContainer}>
                  {passwordValidation.feedback.map((item, index) => (
                    <ThemedText key={index} style={styles.requirementItem}>
                      ○ {item}
                    </ThemedText>
                  ))}
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
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
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isRegistering}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  accessibilityLabel="Confirm password input"
                  accessibilityHint="Re-enter your password to confirm"
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isRegistering}
                >
                  <ThemedText style={styles.showPasswordText}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <ThemedText
                  style={[
                    styles.matchIndicator,
                    {
                      color: passwordsMatch ? '#22c55e' : '#ef4444',
                    },
                  ]}
                >
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </ThemedText>
              )}
            </View>

            {/* Terms & Conditions */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
                disabled={isRegistering}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      backgroundColor: agreeToTerms ? '#0ea5e9' : 'transparent',
                      borderColor: colors.icon,
                    },
                  ]}
                >
                  {agreeToTerms && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <ThemedText style={styles.termsText}>
                  I agree to the Terms & Conditions
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                {
                  backgroundColor: '#0ea5e9',
                  opacity: isRegistering || !agreeToTerms ? 0.6 : 1,
                },
              ]}
              onPress={handleRegister}
              disabled={isRegistering || !agreeToTerms}
              accessibilityRole="button"
              accessibilityLabel="Register button"
              accessibilityHint="Create your account"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.registerButtonText}>
                  Create Account
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.icon }]} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={[styles.divider, { backgroundColor: colors.icon }]} />
            </View>

            {/* Google Register Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  borderColor: colors.icon,
                  opacity: isGoogleLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleGoogleRegister}
              disabled={isGoogleLoading}
              accessibilityRole="button"
              accessibilityLabel="Google Sign Up button"
              accessibilityHint="Register with your Google account"
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>🔵</Text>
                  <ThemedText style={styles.googleButtonText}>
                    Sign up with Google
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer - Login Link */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity
              onPress={handleNavigateToLogin}
              disabled={isRegistering}
            >
              <ThemedText style={styles.loginLink}>
                Sign In
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

  passwordStrengthContainer: {
    marginTop: 8,
    gap: 4,
  },

  strengthBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },

  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },

  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  requirementsContainer: {
    marginTop: 8,
    gap: 4,
    paddingHorizontal: 8,
  },

  requirementItem: {
    fontSize: 12,
    opacity: 0.7,
  },

  matchIndicator: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },

  termsContainer: {
    marginBottom: 20,
  },

  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  termsText: {
    flex: 1,
    fontSize: 13,
  },

  registerButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  registerButtonText: {
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

  loginLink: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
});
