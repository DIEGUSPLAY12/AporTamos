/**
 * Chat tab — list of the user's households; each opens its chat.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHouseholdContext } from '@/context/HouseholdContext';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { households } = useHouseholdContext();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.onSurface }]}>Chats</Text>

        {households.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Sin hogares</Text>
            <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
              Únete o crea un hogar para chatear con sus miembros.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {households.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.row, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }, Shadows.card]}
                onPress={() => router.push(`/(tabs)/chat/${h.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.icon, { backgroundColor: colors.primaryFixed }]}>
                  <Text style={{ fontSize: 20 }}>🏠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.onSurface }]} numberOfLines={1}>{h.name}</Text>
                  <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>Toca para abrir el chat</Text>
                </View>
                <Text style={[styles.arrow, { color: colors.outline }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, paddingVertical: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', maxWidth: 240 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Radius.lg, borderWidth: 1,
  },
  icon: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300' },
});
