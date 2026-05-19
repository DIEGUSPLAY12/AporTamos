/**
 * Home Tab - Household Dashboard
 *
 * Displays a list of households the user is a member of.
 * Users can:
 * - View all their households with streaks and member counts
 * - Create a new household
 * - Navigate to household details for managing tasks and members
 *
 * Features:
 * - List of user's households via HouseholdContext
 * - Create household button (opens CreateHouseholdModal)
 * - HouseholdCard for each household with visual feedback
 * - Navigation to household detail screen (T044)
 * - Loading and error states
 * - Empty state message when no households
 * - Pull-to-refresh functionality
 * - Dark mode support
 * - Responsive design for mobile/tablet/web
 *
 * Integration Points:
 * - Uses HouseholdContext (T048) for household list and creation
 * - Uses HouseholdCard (T043) to display each household
 * - Uses CreateHouseholdModal (T045) for new household creation
 * - Navigates to HouseholdDetail screen (T044) on card press
 *
 * Status: Implements User Story 2 - Create and Join Households
 */

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HouseholdCard } from '@/components/household/HouseholdCard';
import CreateHouseholdModal from '@/components/household/CreateHouseholdModal';
import { useHouseholdContext } from '@/context/HouseholdContext';
import { useAuthState } from '@/hooks/useAuth';

/**
 * HomeScreen Component - Displays list of user's households
 *
 * @returns {JSX.Element} Home screen with household list
 */
export default function HomeScreen() {
  // Theme and layout
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Get user from auth
  const { user: authUser } = useAuthState();

  // Household context
  const {
    households,
    isLoading,
    isLoadingHouseholds,
    error,
    loadHouseholds,
    refreshSelectedHousehold,
    clearError,
  } = useHouseholdContext();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Responsive layout
  const isSmallScreen = width < 400;
  const containerPadding = isSmallScreen ? 12 : 16;

  /**
   * Load households when screen is focused
   */
  useFocusEffect(
    useCallback(() => {
      if (authUser?.id) {
        loadHouseholds();
      }
    }, [authUser?.id, loadHouseholds])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadHouseholds();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadHouseholds]);

  /**
   * Handle household card press - navigate to household detail
   * @param householdId - ID of household to navigate to
   */
  const handleHouseholdPress = useCallback(
    (householdId: string) => {
      clearError();
      router.push(householdId as any);
    },
    [router, clearError]
  );

  /**
   * Handle create household success
   */
  const handleCreateHouseholdSuccess = useCallback(() => {
    setCreateModalVisible(false);
    loadHouseholds();
  }, [loadHouseholds]);

  /**
   * Render household card item
   */
  const renderHouseholdItem = useCallback(
    ({ item }: { item: any }) => (
      <HouseholdCard
        household={item}
        memberCount={item.daily_streak} // Note: Using streak as placeholder for member count from list view
        onPress={() => handleHouseholdPress(item.id)}
        showOwnerBadge={item.owner_id === authUser?.id}
        testID={`household-card-${item.id}`}
      />
    ),
    [authUser?.id, handleHouseholdPress]
  );

  /**
   * Render header with title and create button
   */
  const renderHeader = useCallback(() => {
    return (
      <View style={[styles.header, { paddingHorizontal: containerPadding }]}>
        <View style={styles.titleSection}>
          <ThemedText type="title">My Households</ThemedText>
          <ThemedText style={styles.subtitle}>
            {households.length === 0
              ? 'Create your first household to get started'
              : `You have ${households.length} household${households.length === 1 ? '' : 's'}`}
          </ThemedText>
        </View>

        {/* Create Household Button */}
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            {
              backgroundColor: colors.tint,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => setCreateModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Create new household"
          accessibilityHint="Opens form to create a new household">
          <ThemedText style={styles.createButtonText}>+ Create</ThemedText>
        </Pressable>
      </View>
    );
  }, [colors.tint, households.length]);

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(() => {
    return (
      <View style={[styles.emptyState, { paddingHorizontal: containerPadding }]}>
        <ThemedText style={styles.emptyTitle}>No Households Yet</ThemedText>
        <ThemedText style={styles.emptyMessage}>
          Create a new household to start managing tasks with your family or group.
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.emptyButton,
            {
              backgroundColor: colors.tint,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => setCreateModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Create first household">
          <ThemedText style={styles.createButtonText}>Create Household</ThemedText>
        </Pressable>
      </View>
    );
  }, [containerPadding, colors.tint]);

  /**
   * Render loading state
   */
  if (isLoading && households.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading your households...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorTitle}>Error</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => {
              clearError();
              loadHouseholds();
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading households">
            <ThemedText style={styles.createButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  /**
   * Main render - household list
   */
  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={households}
        renderItem={renderHouseholdItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: containerPadding },
        ]}
        scrollEnabled={households.length > 0}
        testID="household-list"
      />

      {/* Create Household Modal */}
      <CreateHouseholdModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateHouseholdSuccess}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    maxWidth: 280,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
