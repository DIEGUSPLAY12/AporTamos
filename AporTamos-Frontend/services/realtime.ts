/**
 * Realtime chat service for AporTamos.
 *
 * Thin, typed layer over the Supabase realtime infra in services/supabase.ts.
 * Subscribes to INSERT events on the `chat_messages` table for a given channel,
 * so new messages appear in all clients in <2s (SC-004).
 *
 * Requirements (run once in Supabase SQL Editor — see
 * AporTamos-Backend/database/realtime-publication.sql):
 *   ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
 *   ALTER TABLE chat_messages REPLICA IDENTITY FULL;
 */

import { subscribeToChatMessages } from '@/services/supabase';

export type ChatMessageType = 'text' | 'audio' | 'image';

/** Shape of a chat_messages row as delivered by Supabase realtime (snake_case). */
export interface RealtimeChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message_type: ChatMessageType;
  content: string | null;
  media_url: string | null;
  created_at: string;
}

export interface RealtimeSubscription {
  unsubscribe: () => Promise<void>;
}

/**
 * Subscribe to new messages in a chat channel.
 *
 * @param channelId  The chat channel's UUID
 * @param onMessage  Called with each newly-inserted message
 * @returns Handle with `unsubscribe()` — call it on cleanup/unmount
 *
 * @example
 * const sub = subscribeToChannelMessages(channelId, (msg) => addMessage(msg));
 * // later
 * sub.unsubscribe();
 */
export function subscribeToChannelMessages(
  channelId: string,
  onMessage: (message: RealtimeChatMessage) => void
): RealtimeSubscription {
  return subscribeToChatMessages(channelId, (payload: any) => {
    const row = payload?.new;
    if (row && row.id) {
      onMessage(row as RealtimeChatMessage);
    }
  });
}
