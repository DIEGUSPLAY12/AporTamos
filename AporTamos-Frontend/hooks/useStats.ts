/**
 * useStats hook — fetches household and user statistics, updates in real-time.
 *
 * Real-time: subscribes to task_assignments UPDATE events (household_id filter).
 * When is_completed flips to true, stats are refetched within ~5 seconds (SC-005).
 *
 * Note: task_completions has no household_id column, so we subscribe to
 * task_assignments (which does) and re-fetch on any UPDATE, letting the
 * backend recalculate weighted completion_pct.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { get } from '@/services/api';
import { subscribeToTaskAssignments } from '@/services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberStatData {
  userId: string;
  userName: string;
  completionPct: number;
  tasksToday: number;
  tasksCompletedToday: number;
}

export interface HouseholdStatsData {
  householdId: string;
  householdName: string | null;
  completionPct: number;
  dailyStreak: number;
  tasksTotal: number;
  tasksCompleted: number;
  lastCompletionDate: string | null;
  members: MemberStatData[];
}

export interface UserStatsData {
  userId: string;
  userName: string | null;
  householdId: string;
  completionPct: number;
  tasksToday: number;
  tasksCompletedToday: number;
  completionHistory: { date: string; completionPct: number }[];
}

// ─── Mappers (snake_case API → camelCase) ──────────────────────────────────

function mapHouseholdStats(raw: any): HouseholdStatsData {
  return {
    householdId: raw.household_id,
    householdName: raw.household_name ?? null,
    completionPct: raw.completion_pct ?? 0,
    dailyStreak: raw.daily_streak ?? 0,
    tasksTotal: raw.tasks_total ?? 0,
    tasksCompleted: raw.tasks_completed ?? 0,
    lastCompletionDate: raw.last_completion_date ?? null,
    members: (raw.members ?? []).map((m: any): MemberStatData => ({
      userId: m.user_id,
      userName: m.user_name ?? '',
      completionPct: m.completion_pct ?? 0,
      tasksToday: m.tasks_today ?? 0,
      tasksCompletedToday: m.tasks_completed_today ?? 0,
    })),
  };
}

function mapUserStats(raw: any): UserStatsData {
  return {
    userId: raw.user_id,
    userName: raw.user_name ?? null,
    householdId: raw.household_id,
    completionPct: raw.completion_pct ?? 0,
    tasksToday: raw.tasks_today ?? 0,
    tasksCompletedToday: raw.tasks_completed_today ?? 0,
    completionHistory: (raw.completion_history ?? []).map((h: any) => ({
      date: h.date,
      completionPct: h.completion_pct ?? 0,
    })),
  };
}

// ─── useHouseholdStats ────────────────────────────────────────────────────────

export interface UseHouseholdStatsResult {
  stats: HouseholdStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useHouseholdStats(
  householdId: string | null
): UseHouseholdStatsResult {
  const [stats, setStats] = useState<HouseholdStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchStats = useCallback(async () => {
    if (!householdId) return;

    setIsLoading(true);
    setError(null);

    try {
      const raw = await get(`/households/${householdId}/stats`);
      if (isMounted.current) setStats(mapHouseholdStats(raw));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load household stats');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [householdId]);

  // Initial fetch + re-fetch on householdId change
  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    return () => {
      isMounted.current = false;
    };
  }, [fetchStats]);

  // Refetch whenever the screen regains focus (reliable fallback to realtime)
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  // Real-time: re-fetch when any task_assignment in this household is updated
  useEffect(() => {
    if (!householdId) return;

    const sub = subscribeToTaskAssignments(householdId, (payload) => {
      // Re-fetch on any assignment change (completed or new task added)
      fetchStats();
    });

    return () => {
      sub.unsubscribe();
    };
  }, [householdId, fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

// ─── useUserStats ─────────────────────────────────────────────────────────────

export interface UseUserStatsResult {
  stats: UserStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserStats(
  userId: string | null,
  householdId: string | null
): UseUserStatsResult {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchStats = useCallback(async () => {
    if (!userId || !householdId) return;

    setIsLoading(true);
    setError(null);

    try {
      const raw = await get(`/users/${userId}/stats?household_id=${householdId}`);
      if (isMounted.current) setStats(mapUserStats(raw));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load user stats');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [userId, householdId]);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    return () => {
      isMounted.current = false;
    };
  }, [fetchStats]);

  // Refetch whenever the screen regains focus (reliable fallback to realtime)
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  // Real-time: re-fetch on completions in this household
  useEffect(() => {
    if (!householdId) return;

    const sub = subscribeToTaskAssignments(householdId, (payload) => {
      fetchStats();
    });

    return () => {
      sub.unsubscribe();
    };
  }, [householdId, fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

// ─── useStats (combined) ──────────────────────────────────────────────────────

export interface UseStatsResult {
  householdStats: HouseholdStatsData | null;
  userStats: UserStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStats(
  userId: string | null,
  householdId: string | null
): UseStatsResult {
  const household = useHouseholdStats(householdId);
  const user = useUserStats(userId, householdId);

  const refetch = useCallback(async () => {
    await Promise.all([household.refetch(), user.refetch()]);
  }, [household.refetch, user.refetch]);

  return {
    householdStats: household.stats,
    userStats: user.stats,
    isLoading: household.isLoading || user.isLoading,
    error: household.error ?? user.error,
    refetch,
  };
}
