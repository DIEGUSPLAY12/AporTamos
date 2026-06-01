import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthState } from '@/hooks/useAuth';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import * as api from '@/services/api';
import type { HouseholdDetail, HouseholdMember } from '@/types/models';
import HouseholdHeader from '@/components/household/HouseholdHeader';
import MembersSection from '@/components/household/MembersSection';
import InviteMembersModal from '@/components/household/InviteMembersModal';
import StreakDisplay from '@/components/stats/StreakDisplay';
import TaskListItem from '@/components/task/TaskListItem';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface TaskSummaryItem {
  task_id: string;
  assignment_id: string;
  name: string;
  effort_weight: number;
  is_completed: boolean;
  assigned_to: string;
  assignment_date: string;
}

export default function HouseholdDetailScreen(): JSX.Element {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { user } = useAuthState();

  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'progress'>('tasks');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<TaskSummaryItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!householdId) return;
    setIsLoadingTasks(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/households/${householdId}/tasks`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTasks(json.tasks ?? []);
    } catch (e: any) {
      console.error('[Tasks] Failed to load:', e.message);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [householdId]);

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
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !household) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top }}
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

        {/* Streak badge — animated */}
        <StreakDisplay streak={household.daily_streak} size="default" />
      </View>

      {/* Members Section — with individual stats, invite, and remove */}
      <View style={{ paddingHorizontal: Spacing.xl }}>
        <MembersSection
          householdId={household.id}
          currentUserId={user?.id}
          isOwner={isOwner}
          onInvitePress={() => setInviteModalVisible(true)}
          onRemoveMember={(userId, userName) => {
            const member = household.members.find(m => m.user_id === userId);
            if (member) handleRemoveMember(member);
          }}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButtonPrimary, { backgroundColor: colors.primary, ...Shadows.primary }]}
          onPress={() => router.push(`/(tabs)/${householdId}/schedule` as any)}
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

      {/* Task list */}
      {activeTab === 'tasks' && (
        <View style={styles.taskSection}>
          {isLoadingTasks ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : tasks.length === 0 ? (
            <View style={[styles.emptyTask, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskName, { color: colors.onSurface }]}>No hay tareas asignadas hoy</Text>
                <Text style={[styles.taskMeta, { color: colors.subtext }]}>¡Añade tareas al horario semanal!</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {tasks.map((task) => (
                <TaskListItem
                  key={task.assignment_id}
                  taskId={task.task_id}
                  assignmentId={task.assignment_id}
                  name={task.name}
                  effortWeight={task.effort_weight}
                  isCompleted={task.is_completed}
                  assignedTo={task.assigned_to}
                  onPress={() => router.push(`/(tabs)/${householdId}/tasks` as any)}
                />
              ))}
              <TouchableOpacity
                style={[styles.viewAllButton, { borderColor: colors.primary }]}
                onPress={() => router.push(`/(tabs)/${householdId}/tasks` as any)}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver todas las tareas →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {activeTab === 'progress' && (
        <HouseholdHeader
          householdId={household.id}
          householdName={household.name}
        />
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

    {/* Invite Members Modal */}
    {household && (
      <InviteMembersModal
        visible={inviteModalVisible}
        householdId={household.id}
        onClose={() => setInviteModalVisible(false)}
        onSuccess={() => {
          setInviteModalVisible(false);
          fetchHouseholdDetails();
        }}
      />
    )}
    </>
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
  viewAllButton: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },

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
