/**
 * Tab-Based Navigation Layout for AporTamos Application
 *
 * This component provides the main tabbed navigation structure accessible
 * after user authentication. Each tab represents a major feature area.
 *
 * Tab Structure:
 * 1. Home (index) - User's household dashboard and personal statistics
 * 2. Explore - Browse and join available households
 * 3. Chat - Real-time chat channels for household coordination
 * 4. Profile - User profile and settings
 *
 * Features:
 * - Theme-aware tab bar colors (light/dark mode support)
 * - Haptic feedback on tab selection
 * - Icon-based tab indicators
 * - Responsive layout across mobile/tablet/desktop viewports
 * - Header hidden to maximize screen space
 */

import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      {/* Home Tab: Dashboard with user's households and daily statistics */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* Explore Tab: Browse and discover households to join */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />

      {/* Chat Tab: Real-time messaging and household coordination */}
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.right.fill" color={color} />,
        }}
      />

      {/* Profile Tab: User account and settings management */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          // Using a user icon for the profile tab
          //The icon is not showing
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
