/**
 * AvatarPicker — modal to choose a DiceBear avatar.
 *
 * DiceBear HTTP API (https://www.dicebear.com): returns a PNG by URL,
 * deterministic from (style, seed). We render a grid of options and persist
 * the chosen URL via AuthContext.updateAvatar.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

// Styles offered to the user (each renders a different art look)
const STYLES = [
  { key: 'adventurer', label: 'Aventura' },
  { key: 'avataaars', label: 'Clásico' },
  { key: 'bottts', label: 'Robots' },
  { key: 'fun-emoji', label: 'Emojis' },
  { key: 'micah', label: 'Minimal' },
  { key: 'lorelei', label: 'Ilustrado' },
];

// Seeds → each produces a distinct avatar within a style
const SEEDS = ['Aria', 'Leo', 'Mia', 'Max', 'Nova', 'Kai', 'Zoe', 'Sam', 'Luna', 'Theo', 'Ivy', 'Rex'];

export function buildAvatarUrl(style: string, seed: string): string {
  return `${DICEBEAR_BASE}/${style}/png?seed=${encodeURIComponent(seed)}`;
}

interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
}

export default function AvatarPicker({ visible, onClose }: AvatarPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { updateAvatar } = useAuth();

  const [style, setStyle] = useState(STYLES[0].key);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () => SEEDS.map((seed) => buildAvatarUrl(style, seed)),
    [style]
  );

  const handleSave = async () => {
    if (!selectedUrl) return;
    setSaving(true);
    try {
      await updateAvatar(selectedUrl);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Elige tu avatar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.close, { color: colors.onSurfaceVariant }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Style selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleRow} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {STYLES.map((s) => {
              const active = s.key === style;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.styleChip,
                    { backgroundColor: active ? colors.primary : colors.surfaceContainerHighest },
                  ]}
                  onPress={() => { setStyle(s.key); setSelectedUrl(null); }}
                >
                  <Text style={[styles.styleChipText, { color: active ? '#fff' : colors.onSurface }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Avatar grid */}
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {options.map((url) => {
              const selected = url === selectedUrl;
              return (
                <TouchableOpacity
                  key={url}
                  style={[
                    styles.avatarCell,
                    {
                      borderColor: selected ? colors.primary : 'transparent',
                      backgroundColor: colors.surfaceContainerLowest,
                    },
                  ]}
                  onPress={() => setSelectedUrl(url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: url }} style={styles.avatarImg} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: selectedUrl ? colors.primary : colors.surfaceContainerHighest, ...Shadows.primary },
            ]}
            onPress={handleSave}
            disabled={!selectedUrl || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.saveText, { color: selectedUrl ? '#fff' : colors.onSurfaceVariant }]}>
                Usar este avatar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.section,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: 20, fontWeight: '800' },
  close: { fontSize: 18, fontWeight: '700' },

  styleRow: { flexGrow: 0, marginBottom: Spacing.md },
  styleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full },
  styleChipText: { fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingBottom: Spacing.md },
  avatarCell: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarImg: { width: '86%', height: '86%', borderRadius: Radius.sm },

  saveButton: {
    marginTop: Spacing.md,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700' },
});
