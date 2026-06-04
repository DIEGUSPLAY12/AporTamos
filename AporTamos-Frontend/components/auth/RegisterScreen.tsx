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
import { useRegister, useAuthError } from '@/hooks/useAuth';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
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
    feedback.push('Al menos 8 caracteres');
    isValid = false;
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Una letra mayúscula');
    isValid = false;
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Una letra minúscula');
    isValid = false;
  }
  if (!/\d/.test(password)) {
    feedback.push('Un número');
    isValid = false;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Un carácter especial');
    isValid = false;
  }

  return { isValid, feedback };
}

function getPasswordStrength(password: string): {
  level: 'débil' | 'media' | 'buena' | 'fuerte';
  percentage: number;
  color: string;
} {
  if (!password) return { level: 'débil', percentage: 0, color: '#ef4444' };

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  if (strength <= 2) return { level: 'débil', percentage: 25, color: '#ef4444' };
  if (strength <= 3) return { level: 'media', percentage: 50, color: '#f97316' };
  if (strength <= 4) return { level: 'buena', percentage: 75, color: '#eab308' };
  return { level: 'fuerte', percentage: 100, color: '#22c55e' };
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
  const { signIn: googleSignIn, isLoading: isGoogleLoading, error: googleError } = useGoogleSignIn();
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
  const error = localError || contextError || googleError;

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
        setLocalError('El nombre es obligatorio');
        return;
      }

      if (!validateName(name)) {
        setLocalError('El nombre debe tener entre 1 y 100 caracteres');
        return;
      }

      // Validate email
      if (!email.trim()) {
        setLocalError('El correo es obligatorio');
        return;
      }

      if (!validateEmail(email)) {
        setLocalError('Introduce un correo válido');
        return;
      }

      // Validate password
      if (!password) {
        setLocalError('La contraseña es obligatoria');
        return;
      }

      if (!passwordValidation.isValid) {
        setLocalError(
          `La contraseña debe tener: ${passwordValidation.feedback.join(', ')}`
        );
        return;
      }

      // Validate confirm password
      if (!confirmPassword) {
        setLocalError('Confirma tu contraseña');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden');
        return;
      }

      // Validate terms acceptance
      if (!agreeToTerms) {
        setLocalError('Debes aceptar los términos y condiciones');
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
  const handleGoogleRegister = useCallback(() => {
    setLocalError(null);
    clearError();
    googleSignIn(); // hook surfaces a clear message if not configured for this platform
  }, [googleSignIn, clearError]);

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
              Crear cuenta
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Únete a AporTamos para organizar las tareas del hogar
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
              <ThemedText style={styles.label}>Nombre completo</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon,
                    backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                  },
                ]}
                placeholder="Juan Pérez"
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
              <ThemedText style={styles.label}>Correo electrónico</ThemedText>
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
              <ThemedText style={styles.label}>Contraseña</ThemedText>
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
                  placeholder="Crea una contraseña segura"
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
                    {showPassword ? 'Ocultar' : 'Mostrar'}
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
                    Seguridad: {passwordStrength.level}
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
              <ThemedText style={styles.label}>Confirmar contraseña</ThemedText>
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
                  placeholder="Repite tu contraseña"
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
                    {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
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
                  {passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
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
                  Acepto los términos y condiciones
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
                  Crear cuenta
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.icon }]} />
              <ThemedText style={styles.dividerText}>o</ThemedText>
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
                    Registrarse con Google
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer - Login Link */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              ¿Ya tienes cuenta?{' '}
            </ThemedText>
            <TouchableOpacity
              onPress={handleNavigateToLogin}
              disabled={isRegistering}
            >
              <ThemedText style={styles.loginLink}>
                Iniciar sesión
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
