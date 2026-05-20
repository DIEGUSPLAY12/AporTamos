import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthState } from '@/hooks/useAuth';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import * as api from '@/services/api';
import type { HouseholdDetail, HouseholdMember } from '@/types/models';

export default function HouseholdDetailScreen(): JSX.Element {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuthState();

  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'progress'>('tasks');

  const fetchHouseholdDetails = useCallback(async () => {
    if (!householdId) {
      setError('No household ID provided');
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await api.getHouseholdDetails(householdId);
      setHousehold(data);
    } catch (err) {
      const message = err instanceof api.ApiError ? err.message : 'No se pudo cargar el hogar';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHouseholdDetails();
    setIsRefreshing(false);
  }, [fetchHouseholdDetails]);

  useEffect(() => { fetchHouseholdDetails(); }, [fetchHouseholdDetails]);

  const handleRemoveMember = useCallback((member: HouseholdMember) => {
    if (!household || !user?.id) return;
    if (household.owner_id !== user.id) {
      Alert.alert('Sin permisos', 'Solo el propietario puede eliminar miembros.');
      return;
    }
    Alert.alert(
      'Eliminar miembro',
      `¿Eliminar a "${member.name}" del hogar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.removeMember(household.id, member.user_id);
              await fetchHouseholdDetails();
            } catch (err) {
              const message = err instanceof api.ApiError ? err.message : 'Error al eliminar miembro';
              Alert.alert('Error', message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [household, user?.id, fetchHouseholdDetails]);

  if (isLoading && !household) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !household) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Error</Text>
        <Text style={[styles.errorMsg, { color: colors.subtext }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.primary, ...Shadows.primary }]}
          onPress={fetchHouseholdDetails}
        >
          <Text style={styles.pillText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!household) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const isOwner = household.owner_id === user?.id;
  const isMember = household.members.some(m => m.user_id === user?.id);
  const visibleMembers = household.members.slice(0, 3);
  const extraCount = Math.max(0, household.members.length - 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top App Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.background }]}>
        <View style={styles.topBarLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
          <Text style={[styles.appBarTitle, { color: colors.primary }]}>Household Hero</Text>
        </View>
        <TouchableOpacity style={styles.bellButton}>
          <Text style={[styles.bellIcon, { color: colors.primary }]}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Household Name */}
      <View style={styles.headerSection}>
        <Text style={[styles.householdName, { color: colors.onSurface }]}>{household.name}</Text>

        {/* Streak badge */}
        <View style={[styles.streakBadge, { backgroundColor: colors.streak, ...Shadows.streak }]}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>Racha Diaria: {household.daily_streak} días 🔥</Text>
        </View>
      </View>

      {/* Members Card */}
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Miembros de la Casa</Text>
        <View style={styles.membersRow}>
          {/* Avatar stack */}
          <View style={styles.avatarStack}>
            {visibleMembers.map((m, i) => (
              <TouchableOpacity
                key={m.user_id}
                style={[
                  styles.memberAvatar,
                  { backgroundColor: colors.primaryFixed, borderColor: colors.surfaceContainerLow, zIndex: 3 - i },
                  { marginLeft: i === 0 ? 0 : -12 },
                ]}
                onLongPress={() => isOwner && handleRemoveMember(m)}
              >
                <Text style={styles.memberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            {extraCount > 0 && (
              <View style={[
                styles.memberAvatar,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceContainerLow, marginLeft: -12, zIndex: 0 },
              ]}>
                <Text style={[styles.memberAvatarText, { color: colors.onSurfaceVariant, fontSize: 12 }]}>
                  +{extraCount}
                </Text>
              </View>
            )}
          </View>

          {/* Invite button */}
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.primary, ...Shadows.primary, flex: 1 }]}
            onPress={() => Alert.alert('Invitar', 'Esta función estará disponible pronto.')}
          >
            <Text style={styles.pillText}>👥  Invitar Miembros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButtonPrimary, { backgroundColor: colors.primary, ...Shadows.primary }]}
          onPress={() => Alert.alert('Nueva Tarea', 'Esta función estará disponible pronto.')}
        >
          <Text style={styles.actionButtonText}>+  Añadir Nueva Tarea</Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            style={styles.actionButtonGhost}
            onPress={() => router.push(`/(tabs)/${householdId}/schedule` as any)}
          >
            <Text style={[styles.actionButtonGhostText, { color: colors.primary }]}>
              📋  Gestionar Rutinas
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.outlineVariant }]}>
        {(['tasks', 'progress'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? colors.primary : colors.outline },
            ]}>
              {tab === 'tasks' ? 'Mis Tareas de Hoy' : 'Progreso del Hogar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task list placeholder */}
      {activeTab === 'tasks' && (
        <View style={styles.taskSection}>
          {/* Empty state */}
          <View style={[styles.emptyTask, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <View style={[styles.taskCheckEmpty, { borderColor: colors.outlineVariant }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskName, { color: colors.onSurface }]}>No hay tareas asignadas hoy</Text>
              <Text style={[styles.taskMeta, { color: colors.subtext }]}>¡Añade tareas al horario semanal!</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'progress' && (
        <View style={styles.taskSection}>
          <View style={[styles.progressCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.progressLabel, { color: colors.subtext }]}>Completado hoy</Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>0%</Text>
          </View>
        </View>
      )}

      {/* Leave household (non-owners) */}
      {isMember && !isOwner && (
        <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.section }}>
          <TouchableOpacity
            style={[styles.leaveButton, { borderColor: colors.error }]}
            onPress={() => {
              Alert.alert(
                'Abandonar hogar',
                `¿Seguro que quieres abandonar "${household.name}"?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Abandonar',
                    style: 'destructive',
                    onPress: async () => {
                      if (!user?.id) return;
                      try {
                        await api.removeMember(household.id, user.id);
                        router.back();
                      } catch {
                        Alert.alert('Error', 'No se pudo abandonar el hogar.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={[styles.leaveButtonText, { color: colors.error }]}>Abandonar hogar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errorMsg: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { fontSize: 16, fontWeight: '700' },
  bellButton: { padding: 8 },
  bellIcon: { fontSize: 22 },

  // Header
  headerSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  householdName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  streakIcon: { fontSize: 16 },
  streakText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  // Members card
  card: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadows.card,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#4648d4' },

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButtonPrimary: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  actionButtonGhost: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonGhostText: { fontSize: 14, fontWeight: '600' },

  // Pill button
  pill: {
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.md,
  },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Task list
  taskSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.card,
  },
  taskCheckEmpty: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 3,
  },
  taskName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  taskMeta: { fontSize: 12 },

  // Progress
  progressCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.card,
  },
  progressLabel: { fontSize: 14 },
  progressValue: { fontSize: 48, fontWeight: '800' },

  // Leave
  leaveButton: {
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  leaveButtonText: { fontSize: 14, fontWeight: '600' },
});
