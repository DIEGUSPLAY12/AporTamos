import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export interface TaskDetailProps {
  taskId: string;
  assignmentId: string;
  name: string;
  description?: string;
  effortWeight: number;
  isCompleted: boolean;
  assignedTo: string;
  assignmentDate: string;
  /** Signed URL from Supabase Storage — shown when task is completed */
  photoUrl?: string;
  isSubmitting?: boolean;
  onMarkComplete: (assignmentId: string) => void;
  onBack: () => void;
}

export default function TaskDetail({
  taskId,
  assignmentId,
  name,
  description,
  effortWeight,
  isCompleted,
  assignedTo,
  assignmentDate,
  photoUrl,
  isSubmitting = false,
  onMarkComplete,
  onBack,
}: TaskDetailProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const assigneeInitial = assignedTo.charAt(0).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Volver</Text>
      </TouchableOpacity>

      {/* Status indicator */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isCompleted ? colors.primary : colors.outlineVariant },
          ]}
        />
        <Text style={[styles.statusLabel, { color: isCompleted ? colors.primary : colors.subtext }]}>
          {isCompleted ? 'Completada' : 'Pendiente'}
        </Text>
      </View>

      {/* Task title */}
      <Text style={[styles.title, { color: colors.onSurface }]}>{name}</Text>

      {/* Description */}
      {description ? (
        <Text style={[styles.description, { color: colors.subtext }]}>{description}</Text>
      ) : null}

      {/* Info cards */}
      <View style={styles.infoGrid}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>Asignado a</Text>
          <View style={styles.infoAssigneeRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{assigneeInitial}</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.onSurface }]}>{assignedTo}</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>Esfuerzo</Text>
          <Text style={[styles.infoValueLarge, { color: colors.primary }]}>
            {effortWeight}/10
          </Text>
          <View style={[styles.effortBar, { backgroundColor: colors.outlineVariant }]}>
            <View
              style={[
                styles.effortFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(effortWeight / 10) * 100}%` as any,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>Puntos</Text>
          <Text style={[styles.infoValueLarge, { color: colors.streak }]}>
            +{effortWeight * 5} ⚡
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>Fecha</Text>
          <Text style={[styles.infoValue, { color: colors.onSurface }]}>{assignmentDate}</Text>
        </View>
      </View>

      {/* Proof photo (when completed) */}
      {isCompleted && photoUrl ? (
        <View style={styles.photoSection}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Foto de prueba</Text>
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
            <Text style={{ fontSize: 32 }}>📸</Text>
            <Text style={[styles.photoNote, { color: colors.subtext }]}>Foto adjunta</Text>
          </View>
        </View>
      ) : null}

      {/* Mark Complete button */}
      {!isCompleted && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1, ...Shadows.primary },
            ]}
            onPress={() => onMarkComplete(assignmentId)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.completeButtonText}>📸  Marcar como completada</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.completeHint, { color: colors.subtext }]}>
            Se requiere una foto como prueba de completado
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    paddingBottom: Spacing.section * 2,
    gap: Spacing.lg,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoValueLarge: {
    fontSize: 22,
    fontWeight: '800',
  },
  infoAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  effortBar: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  effortFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  photoSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  photoPlaceholder: {
    height: 200,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoNote: {
    fontSize: 13,
  },

  actionSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  completeButton: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  completeHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
