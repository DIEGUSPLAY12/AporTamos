import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export interface UserStatsWidgetProps {
  completionPct: number;
  tasksToday: number;
  tasksCompleted: number;
  streak: number;
  isLoading?: boolean;
}

export default function UserStatsWidget({
  completionPct,
  tasksToday,
  tasksCompleted,
  streak,
  isLoading = false,
}: UserStatsWidgetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const clampedPct = Math.min(100, Math.max(0, completionPct));
  const progressFraction = clampedPct / 100;

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }, Shadows.card]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Mis tareas hoy</Text>
        {/* Streak badge */}
        <View style={[styles.streakBadge, { backgroundColor: colors.streakContainer + '22' }]}>
          <Text style={[styles.streakText, { color: colors.streak }]}>
            🔥 {streak} {streak === 1 ? 'día' : 'días'}
          </Text>
        </View>
      </View>

      {/* Percentage */}
      <Text style={[styles.percentage, { color: colors.primary }]}>
        {Math.round(clampedPct)}%
      </Text>

      {/* Progress bar */}
      <View style={[styles.trackOuter, { backgroundColor: colors.primaryFixed }]}>
        <View
          style={[
            styles.trackFill,
            {
              backgroundColor: clampedPct === 100 ? colors.streak : colors.primary,
              width: `${progressFraction * 100}%` as any,
            },
          ]}
        />
      </View>

      {/* Task count */}
      <Text style={[styles.taskCount, { color: colors.onSurfaceVariant }]}>
        {tasksCompleted}/{tasksToday} {tasksToday === 1 ? 'tarea completada' : 'tareas completadas'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  streakBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },

  percentage: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
  },

  trackOuter: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  taskCount: {
    fontSize: 13,
    fontWeight: '500',
  },
});
