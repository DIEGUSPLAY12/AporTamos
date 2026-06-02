/**
 * ChatList — scrollable list of chat messages.
 *
 * Uses an inverted FlatList: messages are kept newest-first, so the newest
 * renders at the bottom and the view auto-stays at the latest message when new
 * ones arrive. Scrolling up (onEndReached, inverted) loads older history.
 */

import React from 'react';
import { FlatList, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing } from '@/constants/theme';
import ChatMessage, { ChatMessageData } from '@/components/chat/ChatMessage';

interface ChatListProps {
  messages: ChatMessageData[]; // newest-first
  currentUserId?: string | null;
  isLoading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function ChatList({
  messages,
  currentUserId,
  isLoading,
  loadingMore,
  onLoadMore,
}: ChatListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 40 }}>💬</Text>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Aún no hay mensajes</Text>
        <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
          Escribe el primer mensaje del hogar.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      inverted
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatMessage message={item} isOwn={!!currentUserId && item.sender_id === currentUserId} />
      )}
      contentContainerStyle={styles.content}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', maxWidth: 240 },
});
