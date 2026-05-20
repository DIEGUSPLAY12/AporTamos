import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { compressImage, uploadTaskPhoto } from './storage';

const QUEUE_KEY = 'offline_photo_upload_queue';

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
  listeners.set(fn);
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

/** Subscribe to network changes and auto-process queue when online. */
export function startQueueProcessor(): () => void {
  return NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processQueue();
    }
  });
}
