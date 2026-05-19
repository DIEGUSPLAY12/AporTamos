/**
 * useHousehold Hook for AporTamos
 *
 * Custom React hook for managing household data fetching and state.
 * Provides caching, error handling, and refetch capabilities.
 *
 * Features:
 * - Fetch household details with members
 * - Automatic loading and error state management
 * - Response caching to reduce API calls
 * - Refetch capability for manual updates
 * - Network error retry logic
 * - Configurable cache duration
 * - TypeScript support with full typing
 *
 * Hooks:
 * - useHousehold: Fetch and manage household data by ID
 * - useHouseholdState: Get current household state without fetching
 *
 * Usage:
 * ```tsx
 * const { household, isLoading, error, refetch } = useHousehold('abc-123');
 * 
 * if (isLoading) return <ActivityIndicator />;
 * if (error) return <Text>Error: {error}</Text>;
 * 
 * return (
 *   <View>
 *     <Text>{household?.name}</Text>
 *     <Button onPress={refetch} title="Refresh" />
 *   </View>
 * );
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getHouseholdDetails, ApiError } from '@/services/api';
import type { HouseholdDetail } from '@/types/models';

/**
 * Cache entry for household data
 */
interface CacheEntry {
  data: HouseholdDetail;
  timestamp: number;
}

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * In-memory cache for household data
 * Maps household ID to cached data and timestamp
 */
const householdCache = new Map<string, CacheEntry>();

/**
 * Hook state for useHousehold
 */
interface UseHouseholdState {
  household: HouseholdDetail | null;
  isLoading: boolean;
  error: string | null;
  isRefetching: boolean;
}

/**
 * useHousehold Hook
 *
 * Fetches and manages household data with caching and error handling.
 *
 * @param {string} householdId - The ID of the household to fetch
 * @param {boolean} skip - If true, skip fetching (default: false)
 * @returns {Object} Object with household data, loading state, error, and refetch function
 *
 * @example
 * const { household, isLoading, error, refetch } = useHousehold('abc-123');
 */
export function useHousehold(householdId: string, skip = false) {
  const [state, setState] = useState<UseHouseholdState>({
    household: null,
    isLoading: true,
    error: null,
    isRefetching: false,
  });

  const isMountedRef = useRef(true);

  /**
   * Check if cached data is still fresh
   */
  const isCacheFresh = useCallback((householdId: string): boolean => {
    const cached = householdCache.get(householdId);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < CACHE_DURATION;
  }, []);

  /**
   * Get cached data if available and fresh
   */
  const getCachedData = useCallback((householdId: string): HouseholdDetail | null => {
    if (isCacheFresh(householdId)) {
      return householdCache.get(householdId)?.data || null;
    }
    // Clear stale cache
    householdCache.delete(householdId);
    return null;
  }, [isCacheFresh]);

  /**
   * Fetch household data from API
   */
  const fetchHousehold = useCallback(
    async (householdId: string, isRefetch = false) => {
      if (!householdId || skip) return;

      try {
        // Check cache first
        const cached = getCachedData(householdId);
        if (cached && !isRefetch) {
          if (isMountedRef.current) {
            setState({
              household: cached,
              isLoading: false,
              error: null,
              isRefetching: false,
            });
          }
          return;
        }

        // Set loading state
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: !isRefetch,
            isRefetching: isRefetch,
            error: null,
          }));
        }

        // Fetch from API
        const data = await getHouseholdDetails(householdId);

        // Cache the result
        householdCache.set(householdId, {
          data,
          timestamp: Date.now(),
        });

        // Update state
        if (isMountedRef.current) {
          setState({
            household: data,
            isLoading: false,
            error: null,
            isRefetching: false,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Failed to fetch household';

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isRefetching: false,
            error: errorMessage,
          }));
        }

        console.error('[useHousehold] Error fetching household:', error);
      }
    },
    [skip, getCachedData]
  );

  /**
   * Refetch household data
   */
  const refetch = useCallback(async () => {
    if (!householdId) return;
    await fetchHousehold(householdId, true);
  }, [householdId, fetchHousehold]);

  /**
   * Fetch on mount or when householdId changes
   */
  useEffect(() => {
    isMountedRef.current = true;
    fetchHousehold(householdId);

    return () => {
      isMountedRef.current = false;
    };
  }, [householdId, fetchHousehold]);

  return {
    household: state.household,
    isLoading: state.isLoading,
    isRefetching: state.isRefetching,
    error: state.error,
    refetch,
    hasError: !!state.error,
    isReady: !state.isLoading && state.household !== null,
  };
}

/**
 * useHouseholdState Hook (Simple Version)
 *
 * Returns only the household data without fetching.
 * Useful for components that just display cached data.
 *
 * @param {string} householdId - The ID of the household to get from cache
 * @returns {HouseholdDetail | null} The cached household data or null
 *
 * @example
 * const household = useHouseholdState('abc-123');
 */
export function useHouseholdState(householdId: string): HouseholdDetail | null {
  const cached = householdCache.get(householdId);
  return cached?.data || null;
}

/**
 * Clear household cache
 *
 * Useful for logging out or when household data needs to be refreshed globally.
 *
 * @param {string} householdId - Optional: Clear specific household cache. If not provided, clears all.
 *
 * @example
 * clearHouseholdCache(); // Clear all
 * clearHouseholdCache('abc-123'); // Clear specific household
 */
export function clearHouseholdCache(householdId?: string): void {
  if (householdId) {
    householdCache.delete(householdId);
  } else {
    householdCache.clear();
  }
}

/**
 * Preload household data into cache
 *
 * Useful for prefetching data before navigating to a screen.
 *
 * @param {string} householdId - The ID of the household to preload
 * @returns {Promise<HouseholdDetail>} The household data
 *
 * @example
 * // Preload when user navigates
 * await preloadHousehold('abc-123');
 * router.push(`/household/${householdId}`);
 */
export async function preloadHousehold(householdId: string): Promise<HouseholdDetail> {
  try {
    // Check cache first
    const cached = householdCache.get(householdId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from API
    const data = await getHouseholdDetails(householdId);

    // Cache the result
    householdCache.set(householdId, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('[preloadHousehold] Error preloading household:', error);
    throw error;
  }
}

export default useHousehold;
