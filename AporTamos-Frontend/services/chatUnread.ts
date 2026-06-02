/**
 * Chat unread tracking (T109).
 *
 * Lightweight per-household "last read" timestamps in AsyncStorage. The unread
 * badge counts households whose newest message is newer than the last read time
 * and was sent by someone else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const keyFor = (householdId: string) => `chat_read_${householdId}`;

/** Mark a household's chat as read up to `when` (defaults to now). */
export async function markChatRead(householdId: string, when?: string): Promise<void> {
  await AsyncStorage.setItem(keyFor(householdId), when ?? new Date().toISOString());
}

export async function getLastRead(householdId: string): Promise<string | null> {
  return AsyncStorage.getItem(keyFor(householdId));
}

/**
 * Count households with unread messages (newest message newer than last-read
 * and not sent by the current user).
 */
export async function countUnreadHouseholds(
  households: { id: string }[],
  currentUserId?: string | null
): Promise<number> {
  if (households.length === 0) return 0;
  const token = await AsyncStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token ?? ''}` };

  const flags = await Promise.all(
    households.map(async (h) => {
      try {
        const res = await fetch(`${API_BASE}/households/${h.id}/chat/messages?limit=1`, { headers });
        if (!res.ok) return false;
        const msgs = await res.json();
        if (!Array.isArray(msgs) || msgs.length === 0) return false;
        const latest = msgs[0];
        const lastRead = await getLastRead(h.id);
        const isNewer = !lastRead || new Date(latest.created_at) > new Date(lastRead);
        const fromOther = latest.sender_id !== currentUserId;
        return isNewer && fromOther;
      } catch {
        return false;
      }
    })
  );

  return flags.filter(Boolean).length;
}
