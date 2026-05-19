/**
 * HouseholdCard Component for AporTamos
 *
 * Displays a household in a card format with:
 * - Household name (title)
 * - Daily streak (consecutive days at 100% completion)
 * - Member count (number of household members)
 * - Pressable/touchable to navigate to household details
 *
 * Features:
 * - Responsive design for mobile/tablet/web
 * - Dark mode support
 * - Visual feedback on press
 * - Streak badge styling
 * - Member count badge styling
 * - Accessibility labels
 * - Optional custom styling
 *
 * Props:
 * - household: Household object with id, name, daily_streak
 * - memberCount: Number of members in the household (required for display)
 * - onPress: Callback function when card is pressed
 * - testID: Test identifier for automated testing
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { Household } from '@/types/models';

/**
 * HouseholdCardProps interface
 *
 * @interface HouseholdCardProps
 * @property {Household} household - The household data to display
 * @property {number} memberCount - Number of members in this household (can be 0 if not available)
 * @property {() => void} [onPress] - Optional callback when card is pressed
 * @property {ViewStyle} [style] - Optional custom container styles
 * @property {string} [testID] - Optional test identifier
 * @property {boolean} [showOwnerBadge] - Optional flag to show "Owner" badge (for user's own household)
 */
export interface HouseholdCardProps {
  household: Household;
  memberCount?: number;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  showOwnerBadge?: boolean;
}

/**
 * HouseholdCard Component
 *
 * A card component that displays household information in a visually appealing format.
 * Shows the household name, current streak, and member count.
 *
 * @component
 * @example
 * const household = {
 *   id: "abc123",
 *   owner_id: "user123",
 *   name: "Diego's Apartment",
 *   timezone_id: "America/New_York",
 *   daily_streak: 5,
 *   created_at: "2026-05-07T10:00:00Z",
 *   updated_at: "2026-05-07T10:00:00Z",
 * };
 *
 * <HouseholdCard
 *   household={household}
 *   memberCount={3}
 *   onPress={() => router.push(`/household/${household.id}`)}
 *   showOwnerBadge={true}
 * />
 *
 * @returns {JSX.Element} The rendered HouseholdCard component
 */
export function HouseholdCard({
  household,
  memberCount = 0,
  onPress,
  style,
  testID,
  showOwnerBadge = false,
}: HouseholdCardProps): JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();

  // Responsive padding and margins based on screen width
  const isSmallScreen = width < 400;
  const isMediumScreen = width < 768;

  const containerPadding = isSmallScreen ? 12 : 16;
  const badgePadding = isSmallScreen ? 6 : 8;
  const badgeFontSize = isSmallScreen ? 12 : 14;

  /**
   * Handle press event
   */
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  /**
   * Format streak number for display
   */
  const formatStreak = (streak: number): string => {
    return streak === 1 ? '1 day' : `${streak} days`;
  };

  /**
   * Format member count for display
   */
  const formatMembers = (count: number): string => {
    return count === 1 ? '1 member' : `${count} members`;
  };

  /**
   * Get streak color based on value
   * - Red: 0 days
   * - Yellow: 1-2 days
   * - Green: 3+ days
   */
  const getStreakColor = (streak: number): string => {
    if (streak === 0) return '#ef4444'; // red
    if (streak < 3) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const streakColor = getStreakColor(household.daily_streak);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: containerPadding,
      overflow: 'hidden',
    },
    content: {
      padding: containerPadding,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    titleContainer: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    badgesContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: badgePadding,
      paddingVertical: badgePadding - 2,
      borderRadius: 6,
      backgroundColor: colors.cardBackground,
    },
    streakBadge: {
      backgroundColor: `${streakColor}20`, // Add transparency
      borderLeftWidth: 3,
      borderLeftColor: streakColor,
    },
    memberBadge: {
      backgroundColor: '#3b82f620', // blue with transparency
      borderLeftWidth: 3,
      borderLeftColor: '#3b82f6', // blue
    },
    ownerBadge: {
      backgroundColor: '#a78bfa20', // purple with transparency
      borderLeftWidth: 3,
      borderLeftColor: '#a78bfa', // purple
    },
    badgeText: {
      fontSize: badgeFontSize,
      fontWeight: '600',
      color: colors.text,
    },
    streakText: {
      color: streakColor,
    },
    memberText: {
      color: '#3b82f6', // blue
    },
    ownerText: {
      color: '#a78bfa', // purple
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerText: {
      fontSize: 12,
      color: colors.subtext,
    },
  });

  return (
    <Pressable
      onPress={handlePress}
      testID={testID || `household-card-${household.id}`}
      accessible={true}
      accessibilityLabel={`${household.name} household with ${formatStreak(household.daily_streak)} streak`}
      accessibilityRole="button"
      style={({ pressed }) => [
        dynamicStyles.container,
        {
          opacity: pressed ? 0.8 : 1,
          elevation: pressed ? 4 : 2,
        },
        style,
      ]}
    >
      <View style={dynamicStyles.content}>
        {/* Header with title and optional owner badge */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.titleContainer}>
            <Text
              style={dynamicStyles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {household.name}
            </Text>
          </View>

          {showOwnerBadge && (
            <View
              style={[dynamicStyles.badge, dynamicStyles.ownerBadge]}
              testID={`owner-badge-${household.id}`}
            >
              <Text style={[dynamicStyles.badgeText, dynamicStyles.ownerText]}>
                Owner
              </Text>
            </View>
          )}
        </View>

        {/* Streak and Member badges */}
        <View style={dynamicStyles.badgesContainer}>
          {/* Streak badge */}
          <View
            style={[dynamicStyles.badge, dynamicStyles.streakBadge]}
            testID={`streak-badge-${household.id}`}
            accessible={true}
            accessibilityLabel={`${formatStreak(household.daily_streak)} streak`}
          >
            <Text
              style={[dynamicStyles.badgeText, dynamicStyles.streakText]}
              testID={`streak-text-${household.id}`}
            >
              🔥 {formatStreak(household.daily_streak)}
            </Text>
          </View>

          {/* Member count badge */}
          <View
            style={[dynamicStyles.badge, dynamicStyles.memberBadge]}
            testID={`member-badge-${household.id}`}
            accessible={true}
            accessibilityLabel={`${formatMembers(memberCount)}`}
          >
            <Text
              style={[dynamicStyles.badgeText, dynamicStyles.memberText]}
              testID={`member-text-${household.id}`}
            >
              👥 {formatMembers(memberCount)}
            </Text>
          </View>
        </View>

        {/* Footer with last update time */}
        {household.last_completion_date && (
          <View style={dynamicStyles.footer}>
            <Text style={dynamicStyles.footerText}>
              Last updated: {new Date(household.last_completion_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default HouseholdCard;
