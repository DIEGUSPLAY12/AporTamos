import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { compressImage, uploadTaskPhoto } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const QUEUE_KEY = 'offline_photo_upload_queue';
const CHAT_QUEUE_KEY = 'offline_chat_message_queue';

export interface QueuedUpload {
  id: string;
  assignmentId: string;
  imageUri: string;
  addedAt: string;
  retries: number;
}

export type UploadQueueListener = (pending: number) => void;

const listeners = new Set<UploadQueueListener>();
let isProcessing = false;

export function addQueueListener(fn: UploadQueueListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(pending: number) {
  listeners.forEach(fn => fn(pending));
}

async function readQueue(): Promise<QueuedUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedUpload[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyListeners(queue.length);
}

/** Enqueue a failed photo upload for retry when connectivity returns. */
export async function enqueueUpload(assignmentId: string, imageUri: string): Promise<void> {
  const queue = await readQueue();
  const entry: QueuedUpload = {
    id: `${assignmentId}_${Date.now()}`,
    assignmentId,
    imageUri,
    addedAt: new Date().toISOString(),
    retries: 0,
  };
  queue.push(entry);
  await writeQueue(queue);
}

/** Process all queued uploads. Removes successful ones; increments retry counter on failure. */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  isProcessing = true;
  const queue = await readQueue();
  const remaining: QueuedUpload[] = [];

  for (const item of queue) {
    try {
      const compressed = await compressImage(item.imageUri);
      await uploadTaskPhoto(item.assignmentId, compressed.uri);
    } catch {
      if (item.retries < 5) {
        remaining.push({ ...item, retries: item.retries + 1 });
      }
      // Drop after 5 retries to avoid stale queue pollution
    }
  }

  await writeQueue(remaining);
  isProcessing = false;
}

/** Returns how many uploads are waiting in the queue. */
export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

// ─── Chat message queue (T107) ──────────────────────────────────────────────

export interface QueuedChatMessage {
  id: string;
  householdId: string;
  kind: 'text' | 'image' | 'audio';
  content?: string; // for text
  uri?: string;     // for image/audio
  addedAt: string;
  retries: number;
}

async function readChatQueue(): Promise<QueuedChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeChatQueue(queue: QueuedChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(CHAT_QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a chat message that failed to send, for retry on reconnection. */
export async function enqueueChatMessage(
  householdId: string,
  kind: 'text' | 'image' | 'audio',
  payload: { content?: string; uri?: string }
): Promise<void> {
  const queue = await readChatQueue();
  queue.push({
    id: `${householdId}_${Date.now()}`,
    householdId,
    kind,
    content: payload.content,
    uri: payload.uri,
    addedAt: new Date().toISOString(),
    retries: 0,
  });
  await writeChatQueue(queue);
}

/** Raw multipart send of a single chat message (no React/hooks). */
async function sendChatMessageRaw(item: QueuedChatMessage): Promise<void> {
  const token = await AsyncStorage.getItem('auth_token');
  const form = new FormData();
  form.append('message_type', item.kind);
  if (item.kind === 'text') {
    form.append('content', item.content ?? '');
  } else if (item.uri) {
    const isImage = item.kind === 'image';
    form.append('file', {
      uri: item.uri,
      name: isImage ? `image-${Date.now()}.jpg` : `voice-${Date.now()}.m4a`,
      type: isImage ? 'image/jpeg' : 'audio/m4a',
    } as any);
  }
  const res = await fetch(`${API_BASE}/households/${item.householdId}/chat/message`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? ''}` },
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Process queued chat messages; drop after 5 failed retries. */
export async function processChatQueue(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const queue = await readChatQueue();
  if (queue.length === 0) return;

  const remaining: QueuedChatMessage[] = [];
  for (const item of queue) {
    try {
      await sendChatMessageRaw(item);
    } catch {
      if (item.retries < 5) remaining.push({ ...item, retries: item.retries + 1 });
    }
  }
  await writeChatQueue(remaining);
}

/** How many chat messages are waiting to be sent. */
export async function getPendingChatCount(): Promise<number> {
  return (await readChatQueue()).length;
}

/** Subscribe to network changes and auto-process both queues when online. */
export function startQueueProcessor(): () => void {
  return NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processQueue();
      processChatQueue();
    }
  });
}
