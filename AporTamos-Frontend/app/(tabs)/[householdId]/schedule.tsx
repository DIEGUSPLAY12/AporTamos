import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthState } from '@/hooks/useAuth';
import { useSchedule } from '@/hooks/useTasks';
import ScheduleEditor from '@/components/task/ScheduleEditor';
import * as api from '@/services/api';
import type { HouseholdDetail, User, WeeklyTaskScheduleResponse } from '@/types/models';

export default function ScheduleManagementScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuthState();

  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  const {
    data: schedule,
    isLoading: isLoadingSchedule,
    error: scheduleError,
  } = useSchedule(householdId, !householdId);

  const fetchHousehold = useCallback(async () => {
    if (!householdId) return;
    setIsLoadingHousehold(true);
    setHouseholdError(null);
    try {
      const data = await api.getHouseholdDetails(householdId);
      setHousehold(data);
    } catch {
      setHouseholdError('No se pudo cargar el hogar');
    } finally {
      setIsLoadingHousehold(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const handleSuccess = useCallback((_schedule: WeeklyTaskScheduleResponse) => {
    router.back();
  }, [router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const isLoading = isLoadingHousehold || isLoadingSchedule;
  const isOwner = household?.owner_id === user?.id;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Cargando rutina...
          </Text>
        </View>
      </ThemedView>
    );
  }

  if (householdError) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            {householdError}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={fetchHousehold}
          >
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!isOwner) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            Solo el propietario del hogar puede gestionar la rutina.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleCancel}
          >
            <Text style={styles.buttonText}>Volver</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Map HouseholdMember to User shape expected by ScheduleEditor
  const members: User[] = (household?.members ?? []).map((m) => ({
    id: m.user_id,
    name: m.name,
    email: '',
    created_at: m.joined_at,
    updated_at: m.joined_at,
  }));

  return (
    <ThemedView style={styles.container}>
      <ScheduleEditor
        householdId={householdId}
        householdMembers={members}
        existingSchedule={schedule ?? undefined}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
