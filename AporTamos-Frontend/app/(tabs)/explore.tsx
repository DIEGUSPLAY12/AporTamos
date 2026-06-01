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
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSelectedHousehold } from '@/context/HouseholdContext';
import { useAuthState } from '@/hooks/useAuth';
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

export default function MisTareasScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const selectedHousehold = useSelectedHousehold();
  const { user } = useAuthState();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!selectedHousehold?.id) return;
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/households/${selectedHousehold.id}/tasks`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setTasks(json.tasks ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedHousehold?.id]);

  // Re-fetch every time this tab gets focus (catches completions + new tasks)
  useFocusEffect(
    useCallback(() => {
      if (!selectedHousehold?.id) return;
      setLoading(true);
      fetchTasks();
    }, [selectedHousehold?.id, fetchTasks])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  // No household selected yet
  if (!selectedHousehold) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Mis Tareas</Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          Ve a Inicio y selecciona un hogar para ver tus tareas de hoy.
        </Text>
      </View>
    );
  }

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
            {selectedHousehold.name}
          </Text>
        </View>

        {/* Loading */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.emptySubtitle, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => { setLoading(true); fetchTasks(); }}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>¡Sin tareas hoy!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              No tienes tareas asignadas para hoy.
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/(tabs)/${selectedHousehold.id}/schedule` as any)}
            >
              <Text style={styles.retryText}>Gestionar rutinas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskListItem
                key={task.assignment_id}
                taskId={task.task_id}
                assignmentId={task.assignment_id}
                name={task.name}
                effortWeight={task.effort_weight}
                isCompleted={task.is_completed}
                assignedTo={task.assigned_to}
                onPress={() => router.push(`/(tabs)/${selectedHousehold.id}/tasks` as any)}
              />
            ))}
            <TouchableOpacity
              style={[styles.viewAllButton, { borderColor: colors.primary }]}
              onPress={() => router.push(`/(tabs)/${selectedHousehold.id}/tasks` as any)}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                Completar tareas con foto →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },

  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.xl, gap: 4 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, fontWeight: '500' },

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
