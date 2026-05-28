/**
 * Mis Tareas tab — redirects to the selected household's daily task list.
 * If no household is selected yet, shows a prompt to select one.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSelectedHousehold } from '@/context/HouseholdContext';

export default function MisTareasScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const selectedHousehold = useSelectedHousehold();

  useEffect(() => {
    if (selectedHousehold?.id) {
      router.replace(`/(tabs)/${selectedHousehold.id}/tasks` as any);
    }
  }, [selectedHousehold?.id]);

  if (!selectedHousehold) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Mis Tareas</ThemedText>
        <ThemedText style={styles.subtitle}>
          Ve a Inicio y selecciona un hogar para ver tus tareas de hoy.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 260,
  },
});
