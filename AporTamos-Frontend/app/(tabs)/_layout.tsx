import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnreadChats } from '@/hooks/useUnreadChats';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const unreadChats = useUnreadChats();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={26} name={'house.fill'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Mis Tareas',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={26} name={'checkmark.square.fill'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Chats',
          tabBarBadge: unreadChats > 0 ? unreadChats : undefined,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={26} name={'bubble.right.fill'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={26} name={'person.fill'} color={color} />
          ),
        }}
      />

      {/* Rutas internas — ocultas de la tab bar */}
      <Tabs.Screen name="[householdId]/index" options={{ href: null }} />
      <Tabs.Screen name="[householdId]/schedule" options={{ href: null }} />
      <Tabs.Screen name="[householdId]/tasks" options={{ href: null }} />
      <Tabs.Screen name="chat/[householdId]" options={{ href: null }} />
      <Tabs.Screen name="profile/personal-info" options={{ href: null }} />
    </Tabs>
  );
}
