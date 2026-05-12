/**
 * Profile Tab - User Account and Settings
 *
 * Displays user profile information and provides access to account settings,
 * household management, and personal statistics.
 *
 * Features (Future Implementation):
 * - User profile display (name, email, avatar)
 * - List of user's households
 * - Personal statistics and streak tracking
 * - Account settings (notifications, privacy, etc.)
 * - Logout functionality
 *
 * Status: Placeholder - Awaiting US5 implementation (Statistics and Profile)
 */

import { View, Text, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>
      <ThemedText>User profile and settings coming soon...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
