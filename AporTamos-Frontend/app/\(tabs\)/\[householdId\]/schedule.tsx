/**
 * ScheduleManagement Screen
 *
 * Owner-only screen for creating and editing household weekly task schedules.
 *
 * Features:
 * - Display and edit current weekly schedule
 * - Add new tasks to schedule
 * - Modify existing tasks
 * - Owner-only permission checking
 * - Real-time household member updates
 * - Error handling and loading states
 *
 * Route: /[householdId]/schedule
 * Protected: Owner access only
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHouseholdContext } from '@/context/HouseholdContext';
import { useHousehold } from '@/hooks/useHousehold';
import { useSchedule } from '@/hooks/useTasks';
import { useAuthState } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import ScheduleEditor from '@/components/task/ScheduleEditor';

interface ScheduleManagementScreenProps {}

/**
 * ScheduleManagement Screen Component
 *
 * Provides interface for household owners to create and edit weekly task schedules.
 * Fetches household data, current schedule, and household members.
 * Handles permission checking and displays appropriate UI based on user role.
 */
export default function ScheduleManagementScreen(
  _props: ScheduleManagementScreenProps,
): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { user } = useAuthState();

  // Household context
  const { selectedHousehold, isLoading: householdLoading } = useHouseholdContext();

  // Fetch household details (for members)
  const {
    data: householdDetails,
    isLoading: detailsLoading,
    isRefetching: detailsRefetching,
    error: detailsError,
    refetch: refetchDetails,
  } = useHousehold(householdId || '', !householdId);

  // Fetch current schedule
  const {
    data: schedule,
    isLoading: scheduleLoading,
    isRefetching: scheduleRefetching,
    error: scheduleError,
    refetch: refetchSchedule,
  } = useSchedule(householdId || '', !householdId);

  const [refreshing, setRefreshing] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Get household members
  const householdMembers = householdDetails?.members || [];

  // Check if user is household owner
  const isOwner =
    selectedHousehold &&
    user &&
    selectedHousehold.owner_id === user.id;

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchDetails(), refetchSchedule()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDetails, refetchSchedule]);

  /**
   * Handle successful schedule creation/update
   */
  const handleScheduleSuccess = useCallback(() => {
    // Refetch schedule to show updated data
    refetchSchedule();
    // Show success message
    Alert.alert('Success', 'Schedule updated successfully', [
      { text: 'OK', onPress: () => {} },
    ]);
  }, [refetchSchedule]);

  /**
   * Handle schedule editor cancel
   */
  const handleScheduleCancel = useCallback(() => {
    // Go back to household detail
    router.back();
  }, [router]);

  /**
   * Check permissions and redirect if not owner
   */
  useEffect(() => {
    if (!householdLoading && selectedHousehold && !isOwner) {
      setOwnerError('Only household owners can manage the schedule');
      // Redirect after a delay to show error
      const timer = setTimeout(() => {
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [householdLoading, selectedHousehold, isOwner, router]);

  // Error states
  const hasError = detailsError || scheduleError;
  const isLoading = householdLoading || detailsLoading || scheduleLoading;
  const isRefetching = detailsRefetching || scheduleRefetching;

  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      {/* Loading State */}
      {isLoading && (
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color={themeColors.tint}
            testID="schedule-loading"
          />
          <ThemedText style={styles.loadingText}>Loading schedule...</ThemedText>
        </ThemedView>
      )}

      {/* Owner Permission Error */}
      {ownerError && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={[styles.errorText, { color: themeColors.error }]}>
            {ownerError}
          </ThemedText>
          <ThemedText style={styles.redirectText}>
            Redirecting...
          </ThemedText>
        </ThemedView>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.tint}
            />
          }
          style={styles.scrollContainer}
        >
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={[styles.errorTitle, { color: themeColors.error }]}>
              Failed to Load Schedule
            </ThemedText>
            {detailsError && (
              <ThemedText style={styles.errorMessage}>
                {detailsError}
              </ThemedText>
            )}
            {scheduleError && (
              <ThemedText style={styles.errorMessage}>
                {scheduleError}
              </ThemedText>
            )}
            <ThemedText style={styles.retryText}>
              Pull down to retry
            </ThemedText>
          </ThemedView>
        </ScrollView>
      )}

      {/* Main Content */}
      {!isLoading && !ownerError && !hasError && isOwner && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.tint}
            />
          }
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Header */}
          <ThemedView style={styles.header}>
            <ThemedText style={styles.headerTitle}>
              Manage Weekly Schedule
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {selectedHousehold?.name || 'Household'}
            </ThemedText>
          </ThemedView>

          {/* Schedule Editor */}
          <ThemedView style={styles.editorContainer}>
            <ScheduleEditor
              householdId={householdId || ''}
              householdMembers={householdMembers}
              existingSchedule={schedule || undefined}
              onSuccess={handleScheduleSuccess}
              onCancel={handleScheduleCancel}
              testID="schedule-editor"
            />
          </ThemedView>
        </ScrollView>
      )}

      {/* Not Owner / No Permission */}
      {!isLoading && !ownerError && isOwner === false && (
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={[styles.errorText, { color: themeColors.error }]}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.errorMessage}>
            Only household owners can manage the schedule.
          </ThemedText>
        </ThemedView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContainer: {
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },

  editorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },

  retryText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
  },

  redirectText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
});
// End of ScheduleManagementScreen.tsx