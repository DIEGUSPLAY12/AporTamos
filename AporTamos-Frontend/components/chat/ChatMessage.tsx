/**
 * ChatMessage — a single chat bubble (text / image / audio).
 *
 * Own messages align right with the primary color; others align left on a
 * neutral surface and show the sender's name. Audio messages render an inline
 * play/pause player via expo-audio.
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius } from '@/constants/theme';

export interface ChatMessageData {
  id: string;
  sender_id: string;
  sender_name?: string | null;
  message_type: 'text' | 'audio' | 'image';
  content?: string | null;
  media_url?: string | null;
  created_at: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Audio bubble (own hook instance per audio message) ──────────────────────────
function AudioBubble({ uri, tint }: { uri: string; tint: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const playing = status?.playing ?? false;
  const duration = status?.duration ?? 0;
  const current = status?.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      // Restart if finished
      if (duration > 0 && current >= duration) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.audioRow}>
      <TouchableOpacity onPress={toggle} style={[styles.audioButton, { borderColor: tint }]}>
        <Text style={[styles.audioIcon, { color: tint }]}>{playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={styles.audioBarTrack}>
        <View style={[styles.audioBarFill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

interface ChatMessageProps {
  message: ChatMessageData;
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const bubbleColor = isOwn ? colors.primary : colors.surfaceContainerHighest;
  const textColor = isOwn ? '#ffffff' : colors.onSurface;
  const metaColor = isOwn ? 'rgba(255,255,255,0.7)' : colors.onSurfaceVariant;
  const audioTint = isOwn ? '#ffffff' : colors.primary;

  return (
    <View style={[styles.row, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]}>
      <View style={{ maxWidth: '78%' }}>
        {/* Sender name (only for others in the group) */}
        {!isOwn && message.sender_name ? (
          <Text style={[styles.sender, { color: colors.primary }]}>{message.sender_name}</Text>
        ) : null}

        <View
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleColor,
              borderTopLeftRadius: isOwn ? Radius.md : Radius.sm,
              borderTopRightRadius: isOwn ? Radius.sm : Radius.md,
            },
          ]}
        >
          {message.message_type === 'text' && (
            <Text style={[styles.text, { color: textColor }]}>{message.content}</Text>
          )}

          {message.message_type === 'image' && message.media_url && (
            <Image source={{ uri: message.media_url }} style={styles.image} resizeMode="cover" />
          )}

          {message.message_type === 'audio' && message.media_url && (
            <AudioBubble uri={message.media_url} tint={audioTint} />
          )}

          <Text style={[styles.time, { color: metaColor }]}>{formatTime(message.created_at)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginVertical: 3 },
  sender: { fontSize: 12, fontWeight: '700', marginLeft: Spacing.sm, marginBottom: 2 },
  bubble: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 10, fontWeight: '500', alignSelf: 'flex-end' },

  image: { width: 200, height: 200, borderRadius: Radius.sm, marginBottom: 2 },

  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160, paddingVertical: 2 },
  audioButton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  audioIcon: { fontSize: 14 },
  audioBarTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(127,127,127,0.3)', overflow: 'hidden' },
  audioBarFill: { height: 4, borderRadius: 2 },
});
