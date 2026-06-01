import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHouseholdContext } from '@/context/HouseholdContext';
import TaskListItem from '@/components/task/TaskListItem';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface TaskItem {
  task_id: string;
  assignment_id: string;
  name: string;
  effort_weight: number;
  is_completed: boolean;
  assigned_to: string;
}

interface HouseholdTasks {
  householdId: string;
  householdName: string;
  tasks: TaskItem[];
}

export default function MisTareasScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { households } = useHouseholdContext();

  const [grouped, setGrouped] = useState<HouseholdTasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTasks = useCallback(async () => {
    if (households.length === 0) {
      setGrouped([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');

      // Fetch each household's tasks in parallel
      const results = await Promise.all(
        households.map(async (h) => {
          const res = await fetch(`${API_BASE}/households/${h.id}/tasks`, {
            headers: { Authorization: `Bearer ${token ?? ''}` },
          });
          if (!res.ok) {
            return { householdId: h.id, householdName: h.name, tasks: [] as TaskItem[] };
          }
          const json = await res.json();
          return {
            householdId: h.id,
            householdName: h.name,
            tasks: (json.tasks ?? []) as TaskItem[],
          };
        })
      );

      // Only keep households that actually have tasks today
      setGrouped(results.filter((g) => g.tasks.length > 0));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [households]);

  // Re-fetch every time this tab gets focus (catches completions + new tasks)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAllTasks();
    }, [fetchAllTasks])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllTasks();
  }, [fetchAllTasks]);

  // No households at all
  if (households.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Mis Tareas</Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          Ve a Inicio y crea o únete a un hogar para ver tus tareas de hoy.
        </Text>
      </View>
    );
  }

  const totalTasks = grouped.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Mis Tareas de Hoy</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {totalTasks > 0
              ? `${totalTasks} ${totalTasks === 1 ? 'tarea' : 'tareas'} en ${grouped.length} ${grouped.length === 1 ? 'hogar' : 'hogares'}`
              : 'Todos tus hogares'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.emptySubtitle, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => { setLoading(true); fetchAllTasks(); }}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : totalTasks === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>¡Sin tareas hoy!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              No tienes tareas asignadas hoy en ninguno de tus hogares.
            </Text>
          </View>
        ) : (
          // One section per household
          grouped.map((group) => (
            <View key={group.householdId} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  🏠  {group.householdName}
                </Text>
                <Text style={[styles.sectionCount, { color: colors.onSurfaceVariant }]}>
                  {group.tasks.filter((t) => t.is_completed).length}/{group.tasks.length}
                </Text>
              </View>

              <View style={styles.taskList}>
                {group.tasks.map((task) => (
                  <TaskListItem
                    key={task.assignment_id}
                    taskId={task.task_id}
                    assignmentId={task.assignment_id}
                    name={task.name}
                    effortWeight={task.effort_weight}
                    isCompleted={task.is_completed}
                    assignedTo={task.assigned_to}
                    onPress={() => router.push(`/(tabs)/${group.householdId}/tasks` as any)}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.viewAllButton, { borderColor: colors.primary }]}
                  onPress={() => router.push(`/(tabs)/${group.householdId}/tasks` as any)}
                >
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>
                    Completar con foto →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },

  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.lg, gap: 4 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, fontWeight: '500' },

  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionCount: { fontSize: 14, fontWeight: '600' },

  taskList: { gap: Spacing.sm },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 260 },

  retryButton: {
    marginTop: 8,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  viewAllButton: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },
});
