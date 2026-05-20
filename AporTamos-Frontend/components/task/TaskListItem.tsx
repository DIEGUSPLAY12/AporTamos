import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export interface TaskListItemProps {
  taskId: string;
  assignmentId: string;
  name: string;
  effortWeight: number;
  isCompleted: boolean;
  assignedTo?: string;
  /** Optional subtitle: time, location, or any context label */
  subtitle?: string;
  onPress?: (assignmentId: string) => void;
  onComplete?: (assignmentId: string) => void;
}

export default function TaskListItem({
  taskId,
  assignmentId,
  name,
  effortWeight,
  isCompleted,
  assignedTo,
  subtitle,
  onPress,
  onComplete,
}: TaskListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const assigneeInitial = assignedTo ? assignedTo.charAt(0).toUpperCase() : '?';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(assignmentId)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: isCompleted ? colors.primaryFixed : colors.outlineVariant,
        },
      ]}
    >
      {/* Big Check */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          isCompleted
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: 'transparent', borderColor: colors.outlineVariant },
        ]}
        onPress={() => !isCompleted && onComplete?.(assignmentId)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isCompleted && <Text style={styles.checkIcon}>✓</Text>}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.taskName,
            { color: isCompleted ? colors.outline : colors.onSurface },
            isCompleted && styles.taskNameCompleted,
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {isCompleted && (
          <Text style={[styles.completedLabel, { color: colors.subtext }]}>
            Completado
          </Text>
        )}
      </View>

      {/* Right side: assignee + points */}
      <View style={styles.rightCol}>
        {/* Assignee avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{assigneeInitial}</Text>
        </View>

        {/* Effort badge */}
        <View style={[styles.pointsBadge, { backgroundColor: colors.streak }]}>
          <Text style={styles.pointsText}>+{effortWeight * 5} ⚡</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.card,
  },

  // Checkbox
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Text content
  content: {
    flex: 1,
    gap: 3,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  completedLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Right column
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pointsBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pointsText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
