/**
 * Audio service for AporTamos chat voice notes.
 *
 * Recording in expo-audio is hook-based (`useAudioRecorder` in the component),
 * so this service provides the surrounding building blocks: microphone
 * permission, recording audio-mode setup, the recording preset, and uploading
 * a recorded clip to the chat backend.
 *
 * Format: expo-audio records AAC/m4a, already compact for voice notes; we use a
 * quality preset rather than re-encoding (no extra compression dependency).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/** Recording preset used for chat voice notes (AAC/m4a). */
export const CHAT_RECORDING_PRESET = RecordingPresets.HIGH_QUALITY;

/** Ask for microphone permission. Returns true if granted. */
export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

/** Switch audio mode so recording works (and plays even in silent mode). */
export async function enableRecordingMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

/** Restore playback-only audio mode after recording. */
export async function disableRecordingMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

/**
 * Upload a recorded audio clip as a chat message.
 *
 * @param householdId  Target household
 * @param uri          Local file URI from the recorder (`recorder.uri`)
 * @throws Error if the upload fails
 */
export async function uploadAudioMessage(householdId: string, uri: string): Promise<void> {
  const token = await AsyncStorage.getItem('auth_token');

  const form = new FormData();
  form.append('message_type', 'audio');
  form.append('file', {
    uri,
    name: `voice-${Date.now()}.m4a`,
    type: 'audio/m4a',
  } as any);

  const res = await fetch(`${API_BASE}/households/${householdId}/chat/message`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? ''}` }, // let fetch set multipart boundary
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || 'No se pudo enviar el audio');
  }
}
