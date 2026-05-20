import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import TaskListItem from '@/components/task/TaskListItem';
import TaskDetail from '@/components/task/TaskDetail';
import PhotoUpload from '@/components/task/PhotoUpload';
import CompletionStatus from '@/components/task/CompletionStatus';
import { compressImage, uploadTaskPhoto } from '@/services/storage';
import { enqueueUpload, startQueueProcessor } from '@/services/offlineQueue';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface TaskSummaryItem {
  task_id: string;
  assignment_id: string;
  name: string;
  effort_weight: number;
  is_completed: boolean;
  assigned_to: string;
  assignment_date: string;
  photo_url?: string;
  completed_at?: string;
}

interface TaskListResponse {
  date: string;
  household_id: string;
  household_name: string;
  daily_completion_pct: number;
  tasks: TaskSummaryItem[];
}

type DetailView =
  | { kind: 'task'; task: TaskSummaryItem }
  | { kind: 'photo'; task: TaskSummaryItem; photoUri: string };

export default function MyTasksScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const stopQueue = useRef<() => void>();

  useEffect(() => {
    stopQueue.current = startQueueProcessor();
    return () => stopQueue.current?.();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/households/${householdId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar tareas');
      const json: TaskListResponse = await res.json();
      setData(json);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudieron cargar las tareas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [householdId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  function onRefresh() {
    setRefreshing(true);
    fetchTasks();
  }

  async function handleMarkComplete(assignmentId: string) {
    if (!pendingPhoto) {
      Alert.alert('Foto requerida', 'Selecciona una foto de prueba antes de marcar como completada.');
      return;
    }

    setSubmitting(assignmentId);
    try {
      await uploadTaskPhoto(assignmentId, pendingPhoto);
      setPendingPhoto(null);
      setDetail(null);
      await fetchTasks();
    } catch (e: any) {
      Alert.alert(
        'Error al subir',
        e.message || 'No se pudo subir la foto. Se reintentará cuando haya conexión.',
        [
          {
            text: 'Encolar para después',
            onPress: async () => {
              await enqueueUpload(assignmentId, pendingPhoto!);
              setDetail(null);
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setSubmitting(null);
    }
  }

  const pending = data?.tasks.filter(t => !t.is_completed) ?? [];
  const completed = data?.tasks.filter(t => t.is_completed) ?? [];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.onSurface }]}>Mis Tareas</Text>
          {data && (
            <View style={[styles.progressBar, { backgroundColor: colors.outlineVariant }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${data.daily_completion_pct}%` as any },
                ]}
              />
            </View>
          )}
          {data && (
            <Text style={[styles.progressLabel, { color: colors.subtext }]}>
              {Math.round(data.daily_completion_pct)}% completado hoy
            </Text>
          )}
        </View>

        {/* Pending section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Pendientes · {pending.length}
          </Text>
          {pending.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                ¡Todo completado por hoy!
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {pending.map(task => (
                <TaskListItem
                  key={task.assignment_id}
                  taskId={task.task_id}
                  assignmentId={task.assignment_id}
                  name={task.name}
                  effortWeight={task.effort_weight}
                  isCompleted={false}
                  assignedTo={task.assigned_to}
                  onPress={() => setDetail({ kind: 'task', task })}
                  onComplete={() => setDetail({ kind: 'task', task })}
                />
              ))}
            </View>
          )}
        </View>

        {/* Completed section */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Completadas · {completed.length}
            </Text>
            <View style={styles.list}>
              {completed.map(task => (
                <TaskListItem
                  key={task.assignment_id}
                  taskId={task.task_id}
                  assignmentId={task.assignment_id}
                  name={task.name}
                  effortWeight={task.effort_weight}
                  isCompleted
                  assignedTo={task.assigned_to}
                  onPress={() => setDetail({ kind: 'task', task })}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={detail !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setDetail(null); setPendingPhoto(null); }}
      >
        {detail?.kind === 'task' && (
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <TaskDetail
              taskId={detail.task.task_id}
              assignmentId={detail.task.assignment_id}
              name={detail.task.name}
              effortWeight={detail.task.effort_weight}
              isCompleted={detail.task.is_completed}
              assignedTo={detail.task.assigned_to}
              assignmentDate={detail.task.assignment_date}
              photoUrl={detail.task.photo_url}
              isSubmitting={submitting === detail.task.assignment_id}
              onMarkComplete={handleMarkComplete}
              onBack={() => { setDetail(null); setPendingPhoto(null); }}
            />

            {!detail.task.is_completed && (
              <View style={[styles.photoSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.photoSectionTitle, { color: colors.onSurface }]}>
                  Foto de prueba
                </Text>
                <PhotoUpload
                  onPhotoReady={uri => setPendingPhoto(uri)}
                  isUploading={submitting === detail.task.assignment_id}
                />
              </View>
            )}

            {detail.task.is_completed && (
              <View style={[styles.photoSection, { backgroundColor: colors.background }]}>
                <CompletionStatus
                  isCompleted
                  photoUrl={detail.task.photo_url}
                  completedAt={detail.task.completed_at}
                />
              </View>
            )}
          </ScrollView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing.section * 2,
    gap: Spacing.section,
  },

  header: {
    gap: Spacing.sm,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: Spacing.md,
  },

  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  modalScroll: {
    paddingBottom: Spacing.section * 2,
  },
  photoSection: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
