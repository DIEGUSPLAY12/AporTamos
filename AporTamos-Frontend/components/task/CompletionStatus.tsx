import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius } from '@/constants/theme';

export interface CompletionStatusProps {
  isCompleted: boolean;
  photoUrl?: string;
  completedAt?: string;
  onViewPhoto?: () => void;
}

export default function CompletionStatus({
  isCompleted,
  photoUrl,
  completedAt,
  onViewPhoto,
}: CompletionStatusProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formattedTime = completedAt
    ? new Date(completedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (!isCompleted) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
        <View style={[styles.dot, { backgroundColor: colors.outline }]} />
        <Text style={[styles.label, { color: colors.subtext }]}>Pendiente</Text>
      </View>
    );
  }

  return (
    <View style={styles.completedWrapper}>
      <View style={[styles.badge, { backgroundColor: colors.primaryFixed, borderColor: colors.primary }]}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.label, { color: colors.primary }]}>
          Completada{formattedTime ? ` · ${formattedTime}` : ''}
        </Text>
      </View>

      {photoUrl ? (
        <TouchableOpacity
          style={[styles.photoThumb, { borderColor: colors.outlineVariant }]}
          onPress={onViewPhoto}
          activeOpacity={0.85}
        >
          <Image source={{ uri: photoUrl }} style={styles.thumbImage} resizeMode="cover" />
          <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Text style={styles.thumbIcon}>🔍</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.noPhoto, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={styles.noPhotoIcon}>📸</Text>
          <Text style={[styles.noPhotoText, { color: colors.subtext }]}>Foto de prueba adjunta</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  completedWrapper: {
    gap: Spacing.md,
  },

  photoThumb: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 28,
  },

  noPhoto: {
    height: 120,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  noPhotoIcon: {
    fontSize: 28,
  },
  noPhotoText: {
    fontSize: 13,
  },
});
