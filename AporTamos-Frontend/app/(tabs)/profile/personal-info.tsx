/**
 * Personal info screen — edit name/email and change password.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function PersonalInfoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile, changePassword } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) return Alert.alert('Error', 'El nombre no puede estar vacío.');
    if (!isValidEmail(trimmedEmail)) return Alert.alert('Error', 'Introduce un correo válido.');

    setSavingProfile(true);
    try {
      const fields: { name?: string; email?: string } = {};
      if (trimmedName !== user?.name) fields.name = trimmedName;
      if (trimmedEmail !== user?.email) fields.email = trimmedEmail;
      if (Object.keys(fields).length === 0) {
        Alert.alert('Sin cambios', 'No has modificado ningún dato.');
        return;
      }
      await updateProfile(fields);
      Alert.alert('Guardado', 'Tu información se ha actualizado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return Alert.alert('Error', 'Introduce tu contraseña actual.');
    if (newPassword.length < 8) return Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres.');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Listo', 'Contraseña cambiada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.onSurface }];
  const placeholder = colors.outline;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.back, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.onSurface }]}>Información Personal</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Profile card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Tus datos</Text>

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Nombre</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={placeholder}
            editable={!savingProfile}
          />

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Correo electrónico</Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!savingProfile}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, ...Shadows.primary }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>

        {/* Password card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Cambiar contraseña</Text>

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Contraseña actual</Text>
          <TextInput
            style={inputStyle}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={placeholder}
            secureTextEntry
            autoCapitalize="none"
            editable={!changingPassword}
          />

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Nueva contraseña</Text>
          <TextInput
            style={inputStyle}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={placeholder}
            secureTextEntry
            autoCapitalize="none"
            editable={!changingPassword}
          />

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Repetir nueva contraseña</Text>
          <TextInput
            style={inputStyle}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={placeholder}
            secureTextEntry
            autoCapitalize="none"
            editable={!changingPassword}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, ...Shadows.primary }]}
            onPress={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar contraseña</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  back: { fontSize: 32, fontWeight: '300', width: 28 },
  title: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },

  card: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: Spacing.sm },
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    marginTop: Spacing.lg,
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
