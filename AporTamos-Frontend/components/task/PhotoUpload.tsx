import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { compressImage } from '@/services/storage';

export interface PhotoUploadProps {
  onPhotoReady: (uri: string) => void;
  isUploading?: boolean;
}

export default function PhotoUpload({ onPhotoReady, isUploading = false }: PhotoUploadProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  async function requestAndPick(source: 'camera' | 'gallery') {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });

    if (result.canceled || !result.assets[0]) return;

    const rawUri = result.assets[0].uri;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(rawUri);
      setPreviewUri(compressed.uri);
      onPhotoReady(compressed.uri);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo procesar la imagen.');
    } finally {
      setIsCompressing(false);
    }
  }

  function showPicker() {
    Alert.alert(
      'Subir foto',
      'Elige cómo quieres adjuntar la prueba',
      [
        { text: 'Tomar foto', onPress: () => requestAndPick('camera') },
        { text: 'Elegir de galería', onPress: () => requestAndPick('gallery') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  const busy = isCompressing || isUploading;

  return (
    <View style={styles.wrapper}>
      {previewUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          {!busy && (
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={showPicker}
            >
              <Text style={[styles.changeText, { color: colors.primary }]}>Cambiar foto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.placeholder,
            { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
          ]}
          onPress={showPicker}
          disabled={busy}
          activeOpacity={0.7}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.cameraIcon}>📸</Text>
              <Text style={[styles.placeholderText, { color: colors.subtext }]}>
                Toca para adjuntar foto
              </Text>
              <Text style={[styles.placeholderHint, { color: colors.outline }]}>
                Cámara o galería · máx. 5MB
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  placeholder: {
    height: 180,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  cameraIcon: {
    fontSize: 36,
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderHint: {
    fontSize: 12,
  },
  previewContainer: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
  },
  changeButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
