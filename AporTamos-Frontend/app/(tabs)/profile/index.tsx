/**
 * Profile Tab — user account, gamification summary, and settings.
 *
 * Real data: name, email, streak (max across households), global completion %,
 * completed-task count, derived points/level, logout.
 * Settings rows navigate or show "próximamente" where no screen exists yet.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdContext } from '@/context/HouseholdContext';
import AvatarPicker from '@/components/profile/AvatarPicker';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Compact progress ring (pure RN, no SVG) ───────────────────────────────────

function Ring({ value, size = 72, color, bg }: { value: number; size?: number; color: string; bg: string }) {
  const clamp = Math.min(100, Math.max(0, value));
  const strokeW = size * 0.12;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: strokeW, borderColor: bg,
      }} />
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: strokeW, borderColor: color,
        borderRightColor: clamp >= 25 ? color : 'transparent',
        borderBottomColor: clamp >= 50 ? color : 'transparent',
        borderLeftColor: clamp >= 75 ? color : 'transparent',
        opacity: clamp > 0 ? 1 : 0,
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.24, fontWeight: '800', color }}>{Math.round(clamp)}%</Text>
      </View>
    </View>
  );
}

// ─── Profile Screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, signOut } = useAuth();
  const { households } = useHouseholdContext();

  const [completionPct, setCompletionPct] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';
  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase();
  const streak = households.reduce((max, h) => Math.max(max, h.daily_streak ?? 0), 0);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token ?? ''}` };

      // ── Lifetime points (all-time, all households) — independent of household list ──
      try {
        const pRes = await fetch(`${API_BASE}/users/me/points`, { headers });
        if (pRes.ok) {
          const pJson = await pRes.json();
          setPoints(pJson.total_points ?? 0);
        } else {
          console.warn('[Profile] points fetch failed:', pRes.status);
        }
      } catch (e: any) {
        console.warn('[Profile] points fetch error:', e?.message);
      }

      // ── Today's completion % across all households ──
      if (households.length === 0) {
        setCompletionPct(0);
        setCompletedCount(0);
        return;
      }

      const results = await Promise.all(
        households.map(async (h) => {
          try {
            const res = await fetch(`${API_BASE}/households/${h.id}/tasks`, { headers });
            if (!res.ok) return [];
            const json = await res.json();
            return (json.tasks ?? []) as { effort_weight: number; is_completed: boolean }[];
          } catch {
            return [];
          }
        })
      );

      let totalWeight = 0, completedWeight = 0, doneCount = 0;
      for (const tasks of results) {
        for (const t of tasks) {
          const w = t.effort_weight ?? 1;
          totalWeight += w;
          if (t.is_completed) { completedWeight += w; doneCount += 1; }
        }
      }
      setCompletionPct(totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0);
      setCompletedCount(doneCount);
    } finally {
      setIsLoading(false);
    }
  }, [households, user?.id]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  const soon = (label: string) =>
    Alert.alert(label, 'Esta función estará disponible próximamente.');

  // Achievement badges (static — no backend gamification yet)
  const badges = [
    { icon: '🧹', label: 'Rey de la\nLimpieza', bg: colors.primary },
    { icon: '🍳', label: 'Chef\nEstrella', bg: colors.surfaceContainerHighest, fg: colors.onSurface },
    { icon: '🐷', label: 'Ahorrador\nnato', bg: colors.streak },
  ];

  const settingsRows = [
    { icon: '👤', label: 'Información Personal', onPress: () => router.push('/(tabs)/profile/personal-info' as any) },
    { icon: '👥', label: 'Mi Hogar (Familia)', onPress: () => router.push('/(tabs)' as any) },
    { icon: '🔔', label: 'Preferencias de Notificación', onPress: () => soon('Preferencias de Notificación') },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.avatarBadge, { backgroundColor: colors.primaryFixed }]}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </View>
            <Text style={[styles.brandName, { color: colors.primary }]}>AporTamos</Text>
          </View>
          <Text style={{ fontSize: 22, color: colors.primary }}>🔔</Text>
        </View>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setAvatarPickerVisible(true)}
            activeOpacity={0.8}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={[styles.bigAvatar, { backgroundColor: colors.surfaceContainerHighest }]} />
            ) : (
              <View style={[styles.bigAvatar, { backgroundColor: colors.primary, ...Shadows.primary }]}>
                <Text style={styles.bigAvatarText}>{initial}</Text>
              </View>
            )}
            {/* Edit hint badge */}
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.onSurface }]}>{firstName}</Text>
          <Text style={[styles.role, { color: colors.onSurfaceVariant }]}>Maestro del Orden</Text>
        </View>

        {/* Streak card */}
        <View style={[styles.card, styles.streakCard, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.streakTitle, { color: colors.onSurface }]}>Racha Actual</Text>
            <Text style={[styles.streakSub, { color: colors.streak }]}>
              ¡{streak} {streak === 1 ? 'día' : 'días'} seguidos!
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: colors.primaryFixed }]}
            onPress={() => soon('Historial')}
          >
            <Text style={[styles.historyButtonText, { color: colors.onPrimaryFixed }]}>Ver Historial</Text>
          </TouchableOpacity>
        </View>

        {/* Two stat cards */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ring value={completionPct} size={68} color={colors.primary} bg={colors.primaryFixed} />
            )}
            <Text style={[styles.statLabel, { color: colors.onSurface }]}>Tareas de Hoy</Text>
            <Text style={[styles.statSub, { color: colors.onSurfaceVariant }]}>{completedCount} completadas</Text>
          </View>

          <View style={[styles.card, styles.statCard, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
            <View style={[styles.pointsIcon, { backgroundColor: colors.streak }]}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
            </View>
            <Text style={[styles.pointsNumber, { color: colors.onSurface }]}>{points.toLocaleString()}</Text>
            <Text style={[styles.statSub, { color: colors.onSurfaceVariant }]}>Puntos Totales</Text>
          </View>
        </View>

        {/* Achievement badges */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesRow}
        >
          {badges.map((b, i) => (
            <View key={i} style={[styles.badge, { backgroundColor: b.bg }, Shadows.card]}>
              <Text style={{ fontSize: 28 }}>{b.icon}</Text>
              <Text style={[styles.badgeLabel, { color: b.fg ?? '#fff' }]}>{b.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Settings list */}
        <View style={[styles.settingsCard, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
          {settingsRows.map((row, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.settingRow, i < settingsRows.length && { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1 }]}
              onPress={row.onPress}
            >
              <Text style={styles.settingIcon}>{row.icon}</Text>
              <Text style={[styles.settingLabel, { color: colors.onSurface }]}>{row.label}</Text>
              <Text style={[styles.settingChevron, { color: colors.outline }]}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <Text style={styles.settingIcon}>🚪</Text>
            <Text style={[styles.settingLabel, { color: colors.error, fontWeight: '700' }]}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Email footer */}
        {user?.email ? (
          <Text style={[styles.emailFooter, { color: colors.onSurfaceVariant }]}>{user.email}</Text>
        ) : null}
      </ScrollView>

      <AvatarPicker
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBadge: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  profileHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 20, gap: 4 },
  avatarWrapper: { marginBottom: 8 },
  bigAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: '#fff', fontSize: 40, fontWeight: '800' },
  editBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  editBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  name: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  role: { fontSize: 15, fontWeight: '500' },

  card: { borderRadius: Radius.lg, padding: Spacing.xl },
  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: Spacing.md,
  },
  streakTitle: { fontSize: 18, fontWeight: '800' },
  streakSub: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  historyButton: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  historyButtonText: { fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', gap: 6, minHeight: 150, justifyContent: 'center' },
  statLabel: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  statSub: { fontSize: 12, fontWeight: '500' },
  pointsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pointsNumber: { fontSize: 30, fontWeight: '800', marginTop: 4 },

  badgesRow: { gap: Spacing.md, paddingVertical: 4, marginBottom: Spacing.lg },
  badge: {
    width: 110, height: 110, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8,
  },
  badgeLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 15 },

  settingsCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  settingIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  settingChevron: { fontSize: 22, fontWeight: '300' },

  emailFooter: { textAlign: 'center', fontSize: 13, marginTop: Spacing.lg },
});
