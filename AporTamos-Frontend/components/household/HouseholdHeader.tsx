/**
 * HouseholdHeader — connected stats section for the household detail screen.
 *
 * Fetches household stats via useHouseholdStats and renders HouseholdStats.
 * Intended for use in the "Progreso del Hogar" tab of the household detail screen.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing } from '@/constants/theme';
import HouseholdStats, { type MemberStat } from '@/components/stats/HouseholdStats';
import { useHouseholdStats } from '@/hooks/useStats';

interface HouseholdHeaderProps {
  householdId: string;
  householdName?: string;
}

export default function HouseholdHeader({ householdId, householdName }: HouseholdHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { stats, isLoading, error } = useHouseholdStats(householdId);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.onSurfaceVariant }]}>
          No se pudieron cargar las estadísticas
        </Text>
      </View>
    );
  }

  const members: MemberStat[] = (stats?.members ?? []).map((m) => ({
    userId: m.userId,
    userName: m.userName,
    completionPct: m.completionPct,
    tasksToday: m.tasksToday,
    tasksCompletedToday: m.tasksCompletedToday,
  }));

  return (
    <View style={styles.container}>
      <HouseholdStats
        householdName={stats?.householdName ?? householdName}
        completionPct={stats?.completionPct ?? 0}
        streak={stats?.dailyStreak ?? 0}
        tasksTotal={stats?.tasksTotal ?? 0}
        tasksCompleted={stats?.tasksCompleted ?? 0}
        members={members}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  errorContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
