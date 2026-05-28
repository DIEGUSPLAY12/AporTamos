/**
 * MembersSection — household members list with individual completion stats.
 *
 * Connected component: fetches member stats via useHouseholdStats.
 * Replaces the basic avatar-stack card in the household detail screen.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import ProgressBar from '@/components/stats/ProgressBar';
import { useHouseholdStats } from '@/hooks/useStats';

interface MembersSectionProps {
  householdId: string;
  onInvitePress?: () => void;
  currentUserId?: string;
  isOwner?: boolean;
  onRemoveMember?: (userId: string, userName: string) => void;
}

export default function MembersSection({
  householdId,
  onInvitePress,
  currentUserId,
  isOwner = false,
  onRemoveMember,
}: MembersSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { stats, isLoading } = useHouseholdStats(householdId);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Miembros</Text>
        {onInvitePress ? (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary, ...Shadows.primary }]}
            onPress={onInvitePress}
            accessibilityLabel="Invitar miembros"
          >
            <Text style={styles.inviteButtonText}>👥  Invitar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !stats || stats.members.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No hay miembros aún
        </Text>
      ) : (
        <View style={styles.membersList}>
          {stats.members.map((member) => {
            const initial = member.userName ? member.userName.charAt(0).toUpperCase() : '?';
            const isSelf = member.userId === currentUserId;

            return (
              <View key={member.userId} style={styles.memberRow}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
                </View>

                {/* Name + bar + counts */}
                <View style={styles.memberCenter}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.memberName, { color: colors.onSurface }]} numberOfLines={1}>
                      {member.userName}
                      {isSelf ? <Text style={[styles.selfLabel, { color: colors.primary }]}> (tú)</Text> : null}
                    </Text>
                    <Text style={[styles.memberPct, { color: member.completionPct === 100 ? colors.streak : colors.primary }]}>
                      {Math.round(member.completionPct)}%
                    </Text>
                  </View>

                  <ProgressBar value={member.completionPct} height={5} />

                  <Text style={[styles.taskCount, { color: colors.onSurfaceVariant }]}>
                    {member.tasksCompletedToday}/{member.tasksToday} tareas hoy
                  </Text>
                </View>

                {/* Remove button (owner only, not self) */}
                {isOwner && !isSelf && onRemoveMember ? (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveMember(member.userId, member.userName)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Eliminar a ${member.userName}`}
                  >
                    <Text style={[styles.removeIcon, { color: colors.outline }]}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.card,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  inviteButton: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  loadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  membersList: {
    gap: Spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },

  memberCenter: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  selfLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberPct: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  taskCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  removeButton: {
    padding: 4,
    flexShrink: 0,
  },
  removeIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
});
