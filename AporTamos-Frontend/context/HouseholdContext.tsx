/**
 * Household Context for AporTamos
 *
 * Provides centralized household state management and methods
 * for sharing household data across screens. Manages household selection,
 * member information, and allows users to switch between households.
 *
 * Features:
 * - Current household selection across screens
 * - List of user's households
 * - Household member information
 * - Select household by ID
 * - Create new household
 * - Loading and error states
 * - Real-time household updates
 * - Integration with useHousehold hook for detailed data
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Household, HouseholdDetail, HouseholdMember, CreateHouseholdRequest } from '@/types/models';
import { useAuthState } from '@/hooks/useAuth';
import { useHousehold, clearHouseholdCache } from '@/hooks/useHousehold';
import * as api from '@/services/api';

/**
 * Household context type definition
 * Provides all household-related state and methods
 */
interface HouseholdContextType {
  // State
  selectedHousehold: HouseholdDetail | null;
  households: Household[];
  isLoading: boolean;
  error: string | null;
  isLoadingHouseholds: boolean;

  // Methods
  selectHousehold: (householdId: string) => Promise<void>;
  createHousehold: (data: CreateHouseholdRequest) => Promise<string>;
  loadHouseholds: () => Promise<void>;
  refreshSelectedHousehold: () => Promise<void>;
  removeSelectedHousehold: () => void;

  // Utilities
  clearError: () => void;
  isUserOwner: (userId: string) => boolean;
  isUserMember: (userId: string) => boolean;
}

/**
 * Create the household context
 * Default undefined - provider must be used
 */
const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

/**
 * HouseholdProvider component
 *
 * Wraps screens with household state management.
 * Should be placed in app root or above screens that need household access.
 *
 * @example
 * export default function Layout() {
 *   return (
 *     <HouseholdProvider>
 *       <Stack />
 *     </HouseholdProvider>
 *   );
 * }
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  // Get current user from auth context
  const { user: authUser } = useAuthState();

  // Household state
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch detailed household data using the useHousehold hook
  // Skip if no household selected
  const {
    household: selectedHousehold,
    isLoading: isLoadingDetail,
    error: detailError,
    refetch: refetchDetail,
  } = useHousehold(selectedHouseholdId || '', !selectedHouseholdId);

  // Update error state from detailed household fetch
  useEffect(() => {
    if (detailError) {
      setError(detailError);
    }
  }, [detailError]);

  /**
   * Load list of households for current user
   * Calls GET /users/households endpoint (would need to be added to backend)
   * For now, uses mock data retrieval strategy
   */
  const loadHouseholds = useCallback(async () => {
    if (!authUser?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoadingHouseholds(true);
      setError(null);

      // TODO: Implement GET /users/{user_id}/households endpoint in backend
      // For now, we'll fetch household details from API cache
      // In production, fetch user's households via dedicated endpoint
      const userHouseholds = await api.getUserHouseholds();
      setHouseholds(userHouseholds);

      // Auto-select first household if available and none selected
      if (userHouseholds.length > 0 && !selectedHouseholdId) {
        setSelectedHouseholdId(userHouseholds[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load households';
      setError(errorMessage);
      console.error('[HouseholdContext] Error loading households:', err);
    } finally {
      setIsLoadingHouseholds(false);
    }
  }, [authUser?.id, selectedHouseholdId]);

  /**
   * Load households when user is authenticated
   */
  useEffect(() => {
    if (authUser?.id) {
      loadHouseholds();
    }
  }, [authUser?.id, loadHouseholds]);

  /**
   * Select a household by ID
   * Verifies user is member before selecting
   * Updates selectedHouseholdId which triggers useHousehold fetch
   *
   * @param householdId - ID of household to select
   * @throws Error if household not found or user not a member
   */
  const selectHousehold = useCallback(
    async (householdId: string) => {
      try {
        setError(null);

        // Verify household exists in user's list
        const household = households.find((h) => h.id === householdId);
        if (!household) {
          throw new Error('Household not found in your households');
        }

        // Set selected household ID
        // This will trigger useHousehold hook to fetch detailed data
        setSelectedHouseholdId(householdId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to select household';
        setError(errorMessage);
        console.error('[HouseholdContext] Error selecting household:', err);
        throw err;
      }
    },
    [households]
  );

  /**
   * Create a new household
   * Calls POST /households endpoint
   * Adds to household list and selects it
   *
   * @param data - CreateHouseholdRequest with name and timezone_id
   * @returns householdId of newly created household
   */
  const createHousehold = useCallback(
    async (data: CreateHouseholdRequest): Promise<string> => {
      try {
        setError(null);

        const response = await api.createHousehold(data);
        const newHousehold: Household = {
          id: response.id,
          owner_id: authUser?.id || '',
          name: response.name,
          timezone_id: response.timezone_id,
          daily_streak: 0,
          created_at: response.created_at,
          updated_at: response.updated_at,
        };

        // Add to households list
        setHouseholds((prev) => [...prev, newHousehold]);

        // Select the new household
        setSelectedHouseholdId(response.id);

        return response.id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create household';
        setError(errorMessage);
        console.error('[HouseholdContext] Error creating household:', err);
        throw err;
      }
    },
    [authUser?.id]
  );

  /**
   * Refresh selected household details
   * Clears cache and refetches via useHousehold hook
   */
  const refreshSelectedHousehold = useCallback(async () => {
    if (selectedHouseholdId) {
      try {
        setError(null);
        // Clear cache for this household
        clearHouseholdCache(selectedHouseholdId);
        // Refetch detail data
        await refetchDetail();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh household';
        setError(errorMessage);
        console.error('[HouseholdContext] Error refreshing household:', err);
      }
    }
  }, [selectedHouseholdId, refetchDetail]);

  /**
   * Remove household selection
   * Clears selectedHouseholdId but keeps households list
   */
  const removeSelectedHousehold = useCallback(() => {
    setSelectedHouseholdId(null);
    setError(null);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if user is owner of selected household
   *
   * @param userId - User ID to check
   * @returns true if user is household owner
   */
  const isUserOwner = useCallback(
    (userId: string): boolean => {
      return selectedHousehold?.owner_id === userId;
    },
    [selectedHousehold]
  );

  /**
   * Check if user is member of selected household
   * Includes owner check (owner is a member)
   *
   * @param userId - User ID to check
   * @returns true if user is household member or owner
   */
  const isUserMember = useCallback(
    (userId: string): boolean => {
      if (!selectedHousehold) return false;
      if (selectedHousehold.owner_id === userId) return true;
      return selectedHousehold.members?.some((m) => m.user_id === userId) || false;
    },
    [selectedHousehold]
  );

  // Combine loading states
  const isLoading = isLoadingHouseholds || isLoadingDetail;

  // Context value
  const value: HouseholdContextType = {
    selectedHousehold: selectedHousehold || null,
    households,
    isLoading,
    error,
    isLoadingHouseholds,
    selectHousehold,
    createHousehold,
    loadHouseholds,
    refreshSelectedHousehold,
    removeSelectedHousehold,
    clearError,
    isUserOwner,
    isUserMember,
  };

  return (
    <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
  );
}

/**
 * Hook to use household context
 * Must be called within HouseholdProvider
 *
 * @returns HouseholdContextType with all state and methods
 * @throws Error if called outside HouseholdProvider
 *
 * @example
 * const { selectedHousehold, selectHousehold } = useHouseholdContext();
 * const isOwner = useHouseholdContext().isUserOwner(userId);
 */
export function useHouseholdContext(): HouseholdContextType {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHouseholdContext must be used within HouseholdProvider');
  }
  return context;
}

/**
 * Hook to use selected household only
 * Returns null if no household selected
 *
 * @returns Selected household detail or null
 *
 * @example
 * const household = useSelectedHousehold();
 */
export function useSelectedHousehold(): HouseholdDetail | null {
  const { selectedHousehold } = useHouseholdContext();
  return selectedHousehold;
}

/**
 * Hook to use household members of selected household
 * Returns empty array if no household selected
 *
 * @returns Array of household members
 *
 * @example
 * const members = useHouseholdMembers();
 */
export function useHouseholdMembers(): HouseholdMember[] {
  const { selectedHousehold } = useHouseholdContext();
  return selectedHousehold?.members || [];
}

/**
 * Hook to check if user has owner role
 *
 * @param userId - User ID to check
 * @returns true if user is owner of selected household
 *
 * @example
 * const isOwner = useIsHouseholdOwner(userId);
 */
export function useIsHouseholdOwner(userId: string): boolean {
  const { isUserOwner } = useHouseholdContext();
  return isUserOwner(userId);
}

/**
 * Hook to check if user has member role
 *
 * @param userId - User ID to check
 * @returns true if user is member of selected household
 *
 * @example
 * const isMember = useIsHouseholdMember(userId);
 */
export function useIsHouseholdMember(userId: string): boolean {
  const { isUserMember } = useHouseholdContext();
  return isUserMember(userId);
}

export default HouseholdContext;
