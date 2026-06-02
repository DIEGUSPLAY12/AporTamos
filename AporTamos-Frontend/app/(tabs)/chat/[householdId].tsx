/**
 * ChatDetail — full chat UI for one household: ChatList + MessageInput.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthState } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { markChatRead } from '@/services/chatUnread';
import * as api from '@/services/api';
import ChatList from '@/components/chat/ChatList';
import MessageInput from '@/components/chat/MessageInput';

export default function ChatDetailScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { user } = useAuthState();

  const [householdName, setHouseholdName] = useState('Chat');

  const {
    messages,
    isLoading,
    loadingMore,
    sending,
    error,
    isConnected,
    loadMore,
    sendText,
    sendImage,
    sendAudio,
  } = useChat(householdId ?? null);

  // Resolve the household name for the header
  useEffect(() => {
    if (!householdId) return;
    api.getHouseholdDetails(householdId)
      .then((h) => setHouseholdName(h.name))
      .catch(() => {});
  }, [householdId]);

  // Mark chat read up to the newest message (clears the unread badge) — T109
  useEffect(() => {
    if (householdId && messages.length > 0) {
      markChatRead(householdId, messages[0].created_at);
    }
  }, [householdId, messages]);

  const handleSendImage = useCallback((uri: string) => {
    sendImage(uri).catch((e) => Alert.alert('Error', e?.message || 'No se pudo enviar la imagen.'));
  }, [sendImage]);

  const handleSendAudio = useCallback((uri: string) => {
    sendAudio(uri).catch((e) => Alert.alert('Error', e?.message || 'No se pudo enviar el audio.'));
  }, [sendAudio]);

  const handleSendText = useCallback((content: string) => {
    sendText(content).catch((e) => Alert.alert('Error', e?.message || 'No se pudo enviar el mensaje.'));
  }, [sendText]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.back, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>{householdName}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Offline banner (T108) */}
      {!isConnected && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.errorContainer }]}>
          <Text style={[styles.offlineText, { color: colors.error }]}>
            Sin conexión — los mensajes se enviarán al reconectar
          </Text>
        </View>
      )}

      {/* Messages */}
      <View style={{ flex: 1 }}>
        <ChatList
          messages={messages}
          currentUserId={user?.id}
          isLoading={isLoading}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </View>

      {error && messages.length === 0 ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      {/* Composer */}
      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          onSendAudio={handleSendAudio}
          sending={sending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    gap: 8,
  },
  back: { fontSize: 32, fontWeight: '300', width: 28 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  error: { textAlign: 'center', fontSize: 13, paddingVertical: 6 },
  offlineBanner: { paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  offlineText: { fontSize: 12, fontWeight: '600' },
});
