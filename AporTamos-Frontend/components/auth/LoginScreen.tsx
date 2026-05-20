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
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { login, isLoading } = useLogin();
  const { googleLogin, isLoading: isGoogleLoading } = useGoogleAuth();
  const { error: contextError, clearError } = useAuthError();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const error = localError || contextError;
  const isLoggingIn = isLoading || isGoogleLoading;

  const handleLogin = useCallback(async () => {
    setLocalError(null);
    clearError();

    if (!email.trim()) return setLocalError('El correo es obligatorio');
    if (!validateEmail(email)) return setLocalError('Introduce un correo válido');
    if (!password) return setLocalError('La contraseña es obligatoria');
    if (password.length < 8) return setLocalError('La contraseña debe tener al menos 8 caracteres');

    try {
      await login(email, password);
    } catch (err) {
      console.error('[LoginScreen] Login error:', err);
    }
  }, [email, password, login, clearError]);

  const handleGoogleLogin = useCallback(async () => {
    setLocalError(null);
    clearError();
    setLocalError('Integración con Google próximamente. Usa correo y contraseña.');
  }, [googleLogin, clearError]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoWrapper}>
              <View style={[styles.logoCircleBg, { backgroundColor: colors.primaryFixed }]} />
              <View style={[styles.logoBox, { backgroundColor: colors.primary, ...Shadows.primary }]}>
                <Text style={styles.logoIcon}>🏠</Text>
                <View style={[styles.logoBadge, { backgroundColor: colors.streak }]}>
                  <Text style={styles.logoBadgeIcon}>🏆</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.appName, { color: colors.onSurface }]}>AporTamos</Text>
            <Text style={[styles.appSubtitle, { color: colors.subtext }]}>
              ¡Bienvenido! Tu hogar en armonía, empieza aquí.
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorContainer }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity onPress={() => { setLocalError(null); clearError(); }}>
                <Text style={[styles.errorDismiss, { color: colors.error }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Correo electrónico</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
                <Text style={[styles.inputIcon, { color: colors.outline }]}>✉</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoggingIn}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Contraseña</Text>
                <TouchableOpacity onPress={() => router.push('/forgot-password')} disabled={isLoggingIn}>
                  <Text style={[styles.forgotLink, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputRow, { backgroundColor: colors.surfaceContainerHighest }]}>
                <Text style={[styles.inputIcon, { color: colors.outline }]}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isLoggingIn}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                >
                  <Text style={{ color: colors.outline, fontSize: 18 }}>
                    {showPassword ? '🙈' : '👁'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: isLoggingIn ? 0.7 : 1, ...Shadows.primary },
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión →</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
              <Text style={[styles.dividerText, { color: colors.outline }]}>O CONTINUAR CON</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
            </View>

            {/* Social Buttons */}
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              <Text style={[styles.socialButtonIcon, { color: colors.onSurface }]}>G</Text>
              <Text style={[styles.socialButtonText, { color: colors.onSurface }]}>Continuar con Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
              disabled
            >
              <Text style={[styles.socialButtonIcon, { color: colors.onSurface }]}>⌘</Text>
              <Text style={[styles.socialButtonText, { color: colors.onSurface }]}>Continuar con Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.subtext }]}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoggingIn}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Crear nueva cuenta</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.section,
  },

  // Logo area
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.section,
    marginTop: Spacing.xl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircleBg: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    opacity: 0.2,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  logoIcon: {
    fontSize: 28,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeIcon: {
    fontSize: 14,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: Spacing.sm,
  },
  appSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  errorDismiss: {
    fontSize: 16,
    fontWeight: '700',
    paddingLeft: Spacing.sm,
  },

  // Form
  form: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  inputIcon: {
    fontSize: 16,
    width: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  eyeButton: {
    padding: 4,
  },

  // Primary button
  primaryButton: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // Social buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    borderRadius: Radius.full,
    paddingVertical: 14,
    borderWidth: 1,
  },
  socialButtonIcon: {
    fontSize: 14,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
