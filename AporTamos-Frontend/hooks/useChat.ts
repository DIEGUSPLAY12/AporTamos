/**
 * useChat — household chat state: history (paginated), real-time, and sending.
 *
 * - Fetches history from GET /households/{id}/chat/messages (newest-first).
 * - Subscribes to new messages via services/realtime once the channel id is known
 *   (from history, or from the first sent message for empty channels).
 * - Sends text/image/audio via multipart POST; de-duplicates with realtime by id.
 *
 * Offline queueing of failed sends is layered on top in T107.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToChannelMessages, RealtimeChatMessage } from '@/services/realtime';
import type { ChatMessageData } from '@/components/chat/ChatMessage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZE = 50;

export interface UseChatResult {
  messages: ChatMessageData[];
  channelId: string | null;
  isLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sending: boolean;
  error: string | null;
  loadMore: () => void;
  sendText: (content: string) => Promise<void>;
  sendImage: (uri: string) => Promise<void>;
  sendAudio: (uri: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useChat(householdId: string | null): UseChatResult {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const authHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token ?? ''}` };
  }, []);

  // Prepend a message if not already present (dedupe realtime + POST echo)
  const addMessage = useCallback((msg: ChatMessageData) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]));
  }, []);

  const fetchHistory = useCallback(
    async (before?: string) => {
      if (!householdId) return;
      const loadingOlder = !!before;
      loadingOlder ? setLoadingMore(true) : setIsLoading(true);
      try {
        const headers = await authHeaders();
        const qs = `limit=${PAGE_SIZE}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
        const res = await fetch(`${API_BASE}/households/${householdId}/chat/messages?${qs}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const page: ChatMessageData[] = await res.json();

        if (!isMounted.current) return;
        setHasMore(page.length === PAGE_SIZE);
        if (loadingOlder) {
          setMessages((prev) => [...prev, ...page]);
        } else {
          setMessages(page);
        }
        // Learn the channel id from any message (enables realtime subscription)
        if (page.length > 0) setChannelId((cur) => cur ?? page[0].channel_id ?? null);
        setError(null);
      } catch (e: any) {
        if (isMounted.current) setError(e?.message || 'No se pudieron cargar los mensajes');
      } finally {
        if (isMounted.current) { setIsLoading(false); setLoadingMore(false); }
      }
    },
    [householdId, authHeaders]
  );

  // Initial load
  useEffect(() => {
    setMessages([]);
    setChannelId(null);
    fetchHistory();
  }, [fetchHistory]);

  // Real-time subscription once channel id is known
  useEffect(() => {
    if (!channelId) return;
    const sub = subscribeToChannelMessages(channelId, (row: RealtimeChatMessage) => {
      addMessage(row as ChatMessageData);
    });
    return () => { sub.unsubscribe(); };
  }, [channelId, addMessage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    fetchHistory(oldest.created_at);
  }, [loadingMore, hasMore, messages, fetchHistory]);

  // Centralized multipart sender — returns the created message so we can learn
  // the channel id even for a previously-empty channel.
  const sendMultipart = useCallback(
    async (fields: Record<string, string>, file?: { uri: string; name: string; type: string }) => {
      if (!householdId) return;
      setSending(true);
      try {
        const headers = await authHeaders();
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, v));
        if (file) form.append('file', file as any);

        const res = await fetch(`${API_BASE}/households/${householdId}/chat/message`, {
          method: 'POST',
          headers, // do not set Content-Type; fetch adds the multipart boundary
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.detail || `HTTP ${res.status}`);
        }
        const created: ChatMessageData = await res.json();
        if (isMounted.current) {
          setChannelId((cur) => cur ?? created.channel_id ?? null);
          addMessage(created);
          setError(null);
        }
      } catch (e: any) {
        if (isMounted.current) setError(e?.message || 'No se pudo enviar el mensaje');
        throw e;
      } finally {
        if (isMounted.current) setSending(false);
      }
    },
    [householdId, authHeaders, addMessage]
  );

  const sendText = useCallback(
    (content: string) => sendMultipart({ message_type: 'text', content }),
    [sendMultipart]
  );
  const sendImage = useCallback(
    (uri: string) => sendMultipart(
      { message_type: 'image' },
      { uri, name: `image-${Date.now()}.jpg`, type: 'image/jpeg' }
    ),
    [sendMultipart]
  );
  const sendAudio = useCallback(
    (uri: string) => sendMultipart(
      { message_type: 'audio' },
      { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a' }
    ),
    [sendMultipart]
  );

  return {
    messages,
    channelId,
    isLoading,
    loadingMore,
    hasMore,
    sending,
    error,
    loadMore,
    sendText,
    sendImage,
    sendAudio,
    refetch: () => fetchHistory(),
  };
}
