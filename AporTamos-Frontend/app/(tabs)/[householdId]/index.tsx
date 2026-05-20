/**
 * HouseholdDetail Screen - Display Household Information and Members
 *
 * Shows complete household details including:
 * - Household name, streak, timezone
 * - List of household members with roles
 * - Action buttons for household management
 * - Member status and activity information
 *
 * Features:
 * - Real-time data fetching
 * - Error and loading states
 * - Member role badges
 * - Action buttons (invite, leave, remove member)
 * - Empty state handling
 * - Responsive layout
 * - Dark mode support
 *
 * Navigation:
 * - Route parameter: [householdId] - ID of the household to display
 * - Accessed via: /household/{householdId}
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HouseholdCard } from '@/components/household/HouseholdCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthState } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import * as api from '@/services/api';
import type { HouseholdDetail, HouseholdMember } from '@/types/models';

/**
 * HouseholdDetail Screen Component
 *
 * Displays full household information with member list and management options.
 *
 * @returns {JSX.Element} The rendered household detail screen
 */
export default function HouseholdDetailScreen(): JSX.Element {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuthState();
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 400;
  const isMediumScreen = width < 768;

  // State
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch household details
   */
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
      const message = err instanceof api.ApiError ? err.message : 'Failed to load household';
      setError(message);
      console.error('[HouseholdDetail] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHouseholdDetails();
    setIsRefreshing(false);
  }, [fetchHouseholdDetails]);

  /**
   * Load household on mount or when householdId changes
   */
  useEffect(() => {
    fetchHouseholdDetails();
  }, [fetchHouseholdDetails]);

  /**
   * Handle invite member action
   */
  const handleInviteMember = useCallback(() => {
    // TODO: Navigate to invite modal or show bottom sheet
    // For now, show placeholder
    Alert.alert('Invite Member', 'This feature is coming soon. Use the InviteMembersModal component.');
  }, []);

  /**
   * Handle leave household action
   */
  const handleLeaveHousehold = useCallback(async () => {
    if (!household || !user?.id) return;

    Alert.alert(
      'Leave Household',
      `Are you sure you want to leave "${household.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.removeMember(household.id, user.id);
              Alert.alert('Success', 'You have left the household.');
              router.back();
            } catch (err) {
              const message = err instanceof api.ApiError ? err.message : 'Failed to leave household';
              Alert.alert('Error', message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [household, user?.id, router]);

  /**
   * Handle remove member action
   */
  const handleRemoveMember = useCallback((member: HouseholdMember) => {
    if (!household || !user?.id) return;

    // Only owner can remove members
    if (household.owner_id !== user.id) {
      Alert.alert('Permission Denied', 'Only the household owner can remove members.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove "${member.name}" from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.removeMember(household.id, member.user_id);
              // Refresh household data
              await fetchHouseholdDetails();
              Alert.alert('Success', `${member.name} has been removed from the household.`);
            } catch (err) {
              const message = err instanceof api.ApiError ? err.message : 'Failed to remove member';
              Alert.alert('Error', message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [household, user?.id, fetchHouseholdDetails]);

  /**
   * Render member item
   */
  const renderMemberItem = ({ item }: { item: HouseholdMember }): JSX.Element => {
    const isOwner = item.role === 'owner';
    const isCurrentUser = item.user_id === user?.id;
    const isHouseholdOwner = household?.owner_id === user?.id;

    return (
      <View style={[styles.memberItem, { borderBottomColor: colors.border }]}>
        <View style={styles.memberInfo}>
          <View style={styles.memberHeader}>
            <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
              {isCurrentUser && ' (You)'}
            </Text>
            {isOwner && (
              <View style={[styles.roleBadge, styles.ownerBadge]}>
                <Text style={styles.roleBadgeText}>Owner</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberRole, { color: colors.subtext }]}>
            Joined {new Date(item.joined_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Remove button - show if owner is viewing and member is not self */}
        {isHouseholdOwner && !isCurrentUser && !isOwner && (
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </Pressable>
        )}
      </View>
    );
  };

  /**
   * Render empty members list
   */
  const renderEmptyMembers = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.subtext }]}>
        No members yet
      </Text>
    </View>
  );

  // Error state
  if (error && !household) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Error</Text>
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchHouseholdDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Loading state
  if (isLoading && !household) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading household...
          </Text>
        </View>
      </ThemedView>
    );
  }

  // No household data
  if (!household) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Household Not Found
          </Text>
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            The household could not be found or you don't have access to it.
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const isOwner = household.owner_id === user?.id;
  const isMember = household.members.some(m => m.user_id === user?.id);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={household.members}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.user_id}
        ListHeaderComponent={
          <>
            {/* Household Card */}
            <View style={styles.cardContainer}>
              <HouseholdCard
                household={household}
                memberCount={household.members.length}
                showOwnerBadge={isOwner}
                testID={`household-card-${household.id}`}
              />
            </View>

            {/* Household Info Section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Timezone
              </Text>
              <Text style={[styles.sectionContent, { color: colors.subtext }]}>
                {household.timezone_id}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {isOwner && (
                <Pressable
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleInviteMember}
                >
                  <Text style={styles.actionButtonText}>Invite Member</Text>
                </Pressable>
              )}

              {isOwner && (
                <Pressable
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => router.push(`/(tabs)/${householdId}/schedule` as any)}
                >
                  <Text style={styles.actionButtonText}>Manage Schedule</Text>
                </Pressable>
              )}

              {isMember && !isOwner && (
                <Pressable
                  style={[styles.actionButton, styles.destructiveButton]}
                  onPress={handleLeaveHousehold}
                >
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                    Leave Household
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Members Header */}
            <View style={styles.membersHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Members ({household.members.length})
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={renderEmptyMembers}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
        scrollEnabled={true}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    padding: 16,
    paddingTop: 12,
  },
  section: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  destructiveButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  membersHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#a78bfa20',
  },
  ownerBadge: {
    backgroundColor: '#a78bfa20',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a78bfa',
  },
  memberRole: {
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  listContent: {
    flexGrow: 1,
  },
});
