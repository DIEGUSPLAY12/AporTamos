/**
 * MessageInput — chat composer: text field + attach image + record audio + send.
 *
 * Decoupled via callbacks; the parent (useChat / ChatDetail) performs the actual
 * upload. Audio recording uses expo-audio's useAudioRecorder hook.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  CHAT_RECORDING_PRESET,
  requestMicPermission,
  enableRecordingMode,
  disableRecordingMode,
} from '@/services/audio';

interface MessageInputProps {
  onSendText: (text: string) => void;
  onSendImage: (uri: string) => void;
  onSendAudio: (uri: string) => void;
  sending?: boolean;
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MessageInput({ onSendText, onSendImage, onSendAudio, sending }: MessageInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [text, setText] = useState('');

  const recorder = useAudioRecorder(CHAT_RECORDING_PRESET);
  const recState = useAudioRecorderState(recorder);
  const isRecording = recState?.isRecording ?? false;

  const handleSendText = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }, [text, onSendText]);

  const handleAttachImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      onSendImage(result.assets[0].uri);
    }
  }, [onSendImage]);

  const startRecording = useCallback(async () => {
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso al micrófono para grabar audio.');
      return;
    }
    try {
      await enableRecordingMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo iniciar la grabación.');
    }
  }, [recorder]);

  const stopRecording = useCallback(async (send: boolean) => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      await disableRecordingMode();
      if (send && uri) onSendAudio(uri);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo finalizar la grabación.');
    }
  }, [recorder, onSendAudio]);

  // ── Recording state UI ──
  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceContainerLowest, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity onPress={() => stopRecording(false)} style={styles.iconButton}>
          <Text style={{ fontSize: 22 }}>🗑️</Text>
        </TouchableOpacity>
        <View style={styles.recordingInfo}>
          <View style={[styles.recDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.recText, { color: colors.onSurface }]}>
            Grabando… {formatMs(recState?.durationMillis ?? 0)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => stopRecording(true)}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasText = text.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLowest, borderTopColor: colors.outlineVariant }]}>
      {!hasText && (
        <TouchableOpacity onPress={handleAttachImage} style={styles.iconButton} disabled={sending}>
          <Text style={{ fontSize: 22, color: colors.primary }}>📎</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={[styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.onSurface }]}
        placeholder="Escribe un mensaje…"
        placeholderTextColor={colors.outline}
        value={text}
        onChangeText={setText}
        multiline
        editable={!sending}
      />

      {hasText ? (
        <TouchableOpacity
          onPress={handleSendText}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          disabled={sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendIcon}>➤</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={startRecording} style={styles.iconButton} disabled={sending}>
          <Text style={{ fontSize: 22, color: colors.primary }}>🎤</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 8,
    borderTopWidth: 1,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5 },
  recText: { fontSize: 14, fontWeight: '600' },
});
