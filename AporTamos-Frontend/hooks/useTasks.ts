/**
 * useTasks Hook
 *
 * Custom React hook for fetching and managing task data.
 *
 * Features:
 * - Fetch current weekly schedule for a household
 * - Fetch task assignments for today/week
 * - In-memory caching with TTL
 * - Loading and error state management
 * - Refetch capability
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```tsx
 * // Fetch household schedule
 * const { schedule, isLoading, error, refetch } = useSchedule(householdId);
 *
 * // Fetch user's tasks
 * const { tasks, isLoading, error, refetch } = useUserTasks(householdId);
 *
 * // Fetch all household tasks
 * const { tasks, isLoading, error, refetch } = useHouseholdTasks(householdId);
 *
 * // Clear cache
 * clearTasksCache(householdId);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WeeklyTaskScheduleResponse,
  TaskAssignmentResponse,
  TaskListResponse,
  ApiError,
} from '@/types/models';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseTaksState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isReady: boolean;
}

// Cache storage for schedules and tasks
const scheduleCache = new Map<string, CacheEntry<WeeklyTaskScheduleResponse>>();
const userTasksCache = new Map<string, CacheEntry<TaskListResponse>>();
const householdTasksCache = new Map<string, CacheEntry<TaskListResponse>>();

/**
 * Check if cache entry is still fresh
 */
const isCacheFresh = (entry: CacheEntry<any> | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_DURATION;
};

/**
 * Fetch API helper (reuse from api.ts if available)
 */
const fetchFromApi = async (url: string) => {
  // This would normally import from @/services/api
  // For now, return a placeholder that would be replaced
  throw new Error('API client not configured');
};

/**
 * Hook to fetch and manage household schedule
 */
export function useSchedule(
  householdId: string,
  skip = false,
): UseTaksState<WeeklyTaskScheduleResponse> {
  const [schedule, setSchedule] = useState<WeeklyTaskScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch schedule from API
   */
  const fetchSchedule = useCallback(async (isRefresh = false) => {
    if (!householdId || skip) {
      return;
    }

    // Check cache first
    const cacheKey = `schedule-${householdId}`;
    const cached = scheduleCache.get(cacheKey);

    if (isCacheFresh(cached) && !isRefresh) {
      if (isMountedRef.current) {
        setSchedule(cached!.data);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    try {
      if (isRefresh) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      // TODO: Replace with actual API call when endpoint is available
      // const response = await getSchedule(householdId);
      const response: WeeklyTaskScheduleResponse = {
        id: householdId,
        household_id: householdId,
        version: 1,
        tasks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isMountedRef.current) {
        setSchedule(response);
        setError(null);
        scheduleCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch schedule';
      if (isMountedRef.current) {
        setError(errorMsg);
        setSchedule(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [householdId, skip]);

  /**
   * Fetch schedule on mount and when householdId changes
   */
  useEffect(() => {
    isMountedRef.current = true;
    if (!skip) {
      fetchSchedule(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [householdId, skip, fetchSchedule]);

  /**
   * Refetch handler
   */
  const refetch = useCallback(async () => {
    await fetchSchedule(true);
  }, [fetchSchedule]);

  return {
    data: schedule,
    isLoading,
    isRefetching,
    error,
    refetch,
    isReady: !isLoading && !error && schedule !== null,
  };
}

/**
 * Hook to fetch and manage user's task assignments
 */
export function useUserTasks(
  householdId: string,
  skip = false,
): UseTaksState<TaskListResponse> {
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch user tasks from API
   */
  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!householdId || skip) {
      return;
    }

    // Check cache first
    const cacheKey = `user-tasks-${householdId}`;
    const cached = userTasksCache.get(cacheKey);

    if (isCacheFresh(cached) && !isRefresh) {
      if (isMountedRef.current) {
        setTasks(cached!.data);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    try {
      if (isRefresh) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      // TODO: Replace with actual API call when endpoint is available
      // const response = await getUserTasks(householdId);
      const response: TaskListResponse = {
        date: new Date().toISOString().split('T')[0],
        household_id: householdId,
        household_name: '',
        daily_completion_pct: 0,
        tasks: [],
      };

      if (isMountedRef.current) {
        setTasks(response);
        setError(null);
        userTasksCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tasks';
      if (isMountedRef.current) {
        setError(errorMsg);
        setTasks(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [householdId, skip]);

  /**
   * Fetch tasks on mount and when householdId changes
   */
  useEffect(() => {
    isMountedRef.current = true;
    if (!skip) {
      fetchTasks(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [householdId, skip, fetchTasks]);

  /**
   * Refetch handler
   */
  const refetch = useCallback(async () => {
    await fetchTasks(true);
  }, [fetchTasks]);

  return {
    data: tasks,
    isLoading,
    isRefetching,
    error,
    refetch,
    isReady: !isLoading && !error && tasks !== null,
  };
}

/**
 * Hook to fetch and manage all household task assignments
 */
export function useHouseholdTasks(
  householdId: string,
  skip = false,
): UseTaksState<TaskListResponse> {
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch household tasks from API
   */
  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!householdId || skip) {
      return;
    }

    // Check cache first
    const cacheKey = `household-tasks-${householdId}`;
    const cached = householdTasksCache.get(cacheKey);

    if (isCacheFresh(cached) && !isRefresh) {
      if (isMountedRef.current) {
        setTasks(cached!.data);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    try {
      if (isRefresh) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      // TODO: Replace with actual API call when endpoint is available
      // const response = await getHouseholdTasks(householdId);
      const response: TaskListResponse = {
        date: new Date().toISOString().split('T')[0],
        household_id: householdId,
        household_name: '',
        daily_completion_pct: 0,
        tasks: [],
      };

      if (isMountedRef.current) {
        setTasks(response);
        setError(null);
        householdTasksCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch household tasks';
      if (isMountedRef.current) {
        setError(errorMsg);
        setTasks(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [householdId, skip]);

  /**
   * Fetch tasks on mount and when householdId changes
   */
  useEffect(() => {
    isMountedRef.current = true;
    if (!skip) {
      fetchTasks(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [householdId, skip, fetchTasks]);

  /**
   * Refetch handler
   */
  const refetch = useCallback(async () => {
    await fetchTasks(true);
  }, [fetchTasks]);

  return {
    data: tasks,
    isLoading,
    isRefetching,
    error,
    refetch,
    isReady: !isLoading && !error && tasks !== null,
  };
}

/**
 * Clear all tasks cache for a specific household or globally
 */
export function clearTasksCache(householdId?: string): void {
  if (householdId) {
    scheduleCache.delete(`schedule-${householdId}`);
    userTasksCache.delete(`user-tasks-${householdId}`);
    householdTasksCache.delete(`household-tasks-${householdId}`);
  } else {
    scheduleCache.clear();
    userTasksCache.clear();
    householdTasksCache.clear();
  }
}

/**
 * Preload task data for a household before navigation
 */
export async function preloadTasks(householdId: string): Promise<void> {
  // This would trigger fetches in the background
  // Implementation would depend on actual API structure
  const cacheKey = `schedule-${householdId}`;
  if (!isCacheFresh(scheduleCache.get(cacheKey))) {
    // Trigger preload - actual implementation would call API
    // await getSchedule(householdId);
  }
}
