import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHouseholdContext } from '@/context/HouseholdContext';
import { useAuthState } from '@/hooks/useAuth';
import CreateHouseholdModal from '@/components/household/CreateHouseholdModal';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Circular ring component (pure RN, no SVG) ────────────────────────────────

function RingProgress({ value, size = 72, color, bg }: { value: number; size?: number; color: string; bg: string }) {
  const clamp = Math.min(100, Math.max(0, value));
  const strokeW = size * 0.1;
  const inner = size - strokeW * 2;

  // We fake a "filled ring" by layering:
  // 1. outer circle (full, light bg track)
  // 2. clipped fill using the half-rotation trick with overflow hidden
  const half = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: half, borderWidth: strokeW, borderColor: bg,
      }} />
      {/* Hole (creates donut look) */}
      {/* Fill — approximation: solid colored ring for >50%, half for <=50% */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: half,
        borderWidth: strokeW,
        borderColor: color,
        opacity: clamp > 0 ? 1 : 0,
        // Rotate so fill starts from top; use borderRightColor trick for rough arcs
        borderRightColor: clamp >= 25 ? color : 'transparent',
        borderBottomColor: clamp >= 50 ? color : 'transparent',
        borderLeftColor: clamp >= 75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      {/* Inner white hole */}
      <View style={{
        position: 'absolute',
        top: strokeW, left: strokeW,
        width: inner, height: inner,
        borderRadius: inner / 2,
        backgroundColor: bg === 'transparent' ? 'transparent' : undefined,
      }} />
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user: authUser } = useAuthState();
  const { households, isLoading, error, loadHouseholds, clearError } = useHouseholdContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Aggregated completion across ALL households' tasks assigned to the user
  const [completionPct, setCompletionPct] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const firstName = authUser?.name?.split(' ')[0] ?? 'Usuario';
  // Highest streak across all of the user's households
  const streak = households.reduce((max, h) => Math.max(max, h.daily_streak ?? 0), 0);

  // Fetch today's tasks for every household and compute a single weighted %
  const fetchGlobalCompletion = useCallback(async () => {
    if (households.length === 0) {
      setCompletionPct(0);
      return;
    }
    setIsLoadingStats(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const results = await Promise.all(
        households.map(async (h) => {
          try {
            const res = await fetch(`${API_BASE}/households/${h.id}/tasks`, {
              headers: { Authorization: `Bearer ${token ?? ''}` },
            });
            if (!res.ok) return [];
            const json = await res.json();
            return (json.tasks ?? []) as { effort_weight: number; is_completed: boolean }[];
          } catch {
            return [];
          }
        })
      );

      let totalWeight = 0;
      let completedWeight = 0;
      for (const tasks of results) {
        for (const t of tasks) {
          const w = t.effort_weight ?? 1;
          totalWeight += w;
          if (t.is_completed) completedWeight += w;
        }
      }
      setCompletionPct(totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0);
    } finally {
      setIsLoadingStats(false);
    }
  }, [households]);

  useFocusEffect(
    useCallback(() => {
      if (authUser?.id) loadHouseholds();
    }, [authUser?.id, loadHouseholds])
  );

  // Recompute the global % whenever the household list changes / screen focuses
  useEffect(() => { fetchGlobalCompletion(); }, [fetchGlobalCompletion]);
  useFocusEffect(
    useCallback(() => { fetchGlobalCompletion(); }, [fetchGlobalCompletion])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadHouseholds();
      await fetchGlobalCompletion();
    } finally { setIsRefreshing(false); }
  }, [loadHouseholds, fetchGlobalCompletion]);

  if (isLoading && households.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
          Cargando tus hogares...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.avatarBadge, { backgroundColor: colors.primaryFixed }]}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </View>
            <Text style={[styles.brandName, { color: colors.primary }]}>AporTamos</Text>
          </View>
          <TouchableOpacity style={styles.bellButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22, color: colors.primary }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingTitle, { color: colors.onSurface }]}>¡Hola, {firstName}!</Text>
          <Text style={[styles.greetingSubtitle, { color: colors.onSurfaceVariant }]}>
            Listo para conquistar tu hogar hoy.
          </Text>
        </View>

        {/* ── Global Stats ── */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Tus Estadísticas Globales</Text>
        <View style={styles.statsRow}>
          {/* Completion card */}
          <View style={[styles.statsCard, { backgroundColor: colors.surfaceContainerLowest }, Shadows.card]}>
            {isLoadingStats ? (
              <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
            ) : (
              <RingProgress
                value={completionPct}
                size={68}
                color={colors.primary}
                bg={colors.primaryFixed}
              />
            )}
            <Text style={[styles.statsNumber, { color: colors.primary }]}>
              {Math.round(completionPct)}%
            </Text>
            <Text style={[styles.statsLabel, { color: colors.onSurfaceVariant }]}>Media de tareas</Text>
          </View>

          {/* Streak card */}
          <View style={[styles.statsCard, styles.streakCard, { backgroundColor: colors.streak }, Shadows.streak]}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakUnit}>días</Text>
            <Text style={styles.streakCaption}>Mejor Racha 🔥</Text>
          </View>
        </View>

        {/* ── Households ── */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Tus Hogares</Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorContainer, borderRadius: Radius.md }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={() => { clearError(); loadHouseholds(); }}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : households.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.outlineVariant }]}>
            <Text style={{ fontSize: 32 }}>🏘️</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Sin hogares aún</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              Crea tu primer hogar para empezar
            </Text>
          </View>
        ) : (
          <View style={styles.householdList}>
            {households.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.householdRow, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }, Shadows.card]}
                onPress={() => router.push(h.id as any)}
                activeOpacity={0.75}
              >
                {/* Icon */}
                <View style={[styles.householdIcon, { backgroundColor: colors.primaryFixed }]}>
                  <Text style={{ fontSize: 20 }}>🏠</Text>
                </View>

                {/* Info */}
                <View style={styles.householdInfo}>
                  <Text style={[styles.householdName, { color: colors.onSurface }]} numberOfLines={1}>
                    {h.name}
                  </Text>
                  <Text style={[styles.householdMeta, { color: colors.onSurfaceVariant }]}>
                    {h.daily_streak > 0 ? `🔥 ${h.daily_streak} días de racha` : 'Sin racha activa'}
                  </Text>
                </View>

                {/* Arrow */}
                <Text style={[styles.arrow, { color: colors.outline }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Add Household Button ── */}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.primary }]}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.addButtonText, { color: colors.primary }]}>＋</Text>
        </TouchableOpacity>
      </ScrollView>

      <CreateHouseholdModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => { setCreateModalVisible(false); loadHouseholds(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBadge: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  bellButton: { padding: 4 },

  // Greeting
  greeting: { paddingTop: 20, paddingBottom: 8, gap: 4 },
  greetingTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  greetingSubtitle: { fontSize: 15, fontWeight: '400' },

  // Section titles
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statsCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'flex-start',
    gap: 6,
    minHeight: 160,
  },
  statsNumber: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  statsLabel: { fontSize: 13, fontWeight: '500' },

  streakCard: { alignItems: 'flex-start', justifyContent: 'flex-end' },
  streakNumber: { color: '#fff', fontSize: 48, fontWeight: '800', lineHeight: 52, marginTop: 'auto' as any },
  streakUnit: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: -4 },
  streakCaption: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Households
  householdList: { gap: 10 },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  householdIcon: {
    width: 48, height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  householdInfo: { flex: 1 },
  householdName: { fontSize: 15, fontWeight: '700' },
  householdMeta: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300', flexShrink: 0 },

  // Empty / Error
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 220 },
  errorBox: { padding: 16, gap: 8, alignItems: 'center' },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryText: { fontSize: 14, fontWeight: '600' },

  // Add button
  addButton: {
    marginTop: 16,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
