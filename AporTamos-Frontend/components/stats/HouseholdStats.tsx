import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export interface MemberStat {
  userId: string;
  userName: string;
  completionPct: number;
  tasksToday: number;
  tasksCompletedToday: number;
}

export interface HouseholdStatsProps {
  householdName?: string;
  completionPct: number;
  streak: number;
  tasksTotal: number;
  tasksCompleted: number;
  members: MemberStat[];
  isLoading?: boolean;
}

export default function HouseholdStats({
  householdName,
  completionPct,
  streak,
  tasksTotal,
  tasksCompleted,
  members,
  isLoading = false,
}: HouseholdStatsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const clampedPct = Math.min(100, Math.max(0, completionPct));

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }, Shadows.card]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {householdName ? (
            <Text style={[styles.householdName, { color: colors.onSurface }]} numberOfLines={1}>
              {householdName}
            </Text>
          ) : null}
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
            Progreso del hogar
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: colors.streak + '22' }]}>
          <Text style={[styles.streakText, { color: colors.streak }]}>
            🔥 {streak}
          </Text>
        </View>
      </View>

      {/* Completion percentage */}
      <Text style={[styles.percentage, { color: clampedPct === 100 ? colors.streak : colors.primary }]}>
        {Math.round(clampedPct)}%
      </Text>

      {/* Progress bar */}
      <View style={[styles.trackOuter, { backgroundColor: colors.primaryFixed }]}>
        <View
          style={[
            styles.trackFill,
            {
              backgroundColor: clampedPct === 100 ? colors.streak : colors.primary,
              width: `${clampedPct}%` as any,
            },
          ]}
        />
      </View>

      {/* Task counts */}
      <Text style={[styles.taskCount, { color: colors.onSurfaceVariant }]}>
        {tasksCompleted}/{tasksTotal} {tasksTotal === 1 ? 'tarea completada hoy' : 'tareas completadas hoy'}
      </Text>

      {/* Members section */}
      {members.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          <Text style={[styles.membersLabel, { color: colors.onSurfaceVariant }]}>
            Miembros
          </Text>
          <View style={styles.membersList}>
            {members.map((member) => (
              <MemberRow key={member.userId} member={member} colors={colors} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function MemberRow({ member, colors }: { member: MemberStat; colors: typeof Colors.light }) {
  const clampedPct = Math.min(100, Math.max(0, member.completionPct));
  const initial = member.userName ? member.userName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.memberRow}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
      </View>

      {/* Name + bar */}
      <View style={styles.memberCenter}>
        <Text style={[styles.memberName, { color: colors.onSurface }]} numberOfLines={1}>
          {member.userName}
        </Text>
        <View style={[styles.memberTrackOuter, { backgroundColor: colors.surfaceContainerHigh }]}>
          <View
            style={[
              styles.memberTrackFill,
              {
                backgroundColor: clampedPct === 100 ? colors.streak : colors.primary,
                width: `${clampedPct}%` as any,
              },
            ]}
          />
        </View>
      </View>

      {/* Percentage */}
      <Text style={[styles.memberPct, { color: colors.onSurfaceVariant }]}>
        {Math.round(clampedPct)}%
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
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
    gap: 2,
  },
  householdName: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  streakBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexShrink: 0,
  },
  streakText: {
    fontSize: 14,
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

  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },

  membersLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  membersList: {
    gap: Spacing.md,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberCenter: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberTrackOuter: {
    height: 5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  memberTrackFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  memberPct: {
    fontSize: 13,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
  },
});
