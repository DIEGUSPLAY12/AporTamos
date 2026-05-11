/**
 * Login Screen
 *
 * This screen provides:
 * - Email and password input fields
 * - Login button with error handling
 * - Google OAuth button for single-sign-on
 * - Link to registration for new users
 * - Link to password reset for forgotten passwords
 *
 * Integration:
 * - Uses Supabase Auth client for email/password login
 * - Uses Supabase Auth client for Google OAuth
 * - Submits credentials to /auth/login endpoint (via Supabase)
 * - Stores JWT token automatically via Supabase session
 * - Handles validation errors (invalid email, wrong password)
 * - Handles server errors (user not found, auth disabled)
 *
 * Note: Full implementation in US1 (T030)
 */

import { Link } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement email/password login with Supabase (US1 - T026)
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      Alert.alert('Not Implemented', 'Login functionality will be implemented in US1');
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google OAuth login with Supabase (US1 - T027)
      // const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      Alert.alert('Not Implemented', 'Google login will be implemented in US1');
    } catch (error) {
      Alert.alert('Error', 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AporTamos</Text>
        <Text style={styles.subtitle}>Household Task Management</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Login with Google</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </Link>

        <Text style={styles.divider}>Don't have an account?</Text>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={[styles.link, styles.registerLink]}>Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#007AFF',
  },
  googleButton: {
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  googleButton__text: {
    color: '#333',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registerLink: {
    fontSize: 16,
  },
  divider: {
    color: '#999',
    fontSize: 14,
  },
});
