/**
 * Supabase Client Initialization for AporTamos Frontend
 *
 * This module provides:
 * - Singleton Supabase client instance
 * - Authentication state management hooks
 * - Real-time subscription setup
 * - Error handling and logging
 * - Token refresh management
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Environment variables (from .env via expo-env.d.ts)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "⚠️  Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Custom storage implementation that gracefully handles AsyncStorage unavailability
 * Falls back to in-memory storage if AsyncStorage native module is not available
 */
const createCustomStorage = () => {
  const memoryStorage: { [key: string]: string } = {};
  
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error: any) {
        console.warn(`[Storage] AsyncStorage.getItem failed, using memory fallback:`, error?.message);
        return memoryStorage[key] || null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error: any) {
        console.warn(`[Storage] AsyncStorage.setItem failed, using memory fallback:`, error?.message);
        memoryStorage[key] = value;
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error: any) {
        console.warn(`[Storage] AsyncStorage.removeItem failed, using memory fallback:`, error?.message);
        delete memoryStorage[key];
      }
    },
  };
};

const customStorage = createCustomStorage();

/**
 * Mock/Demo user for development without database
 * Allows login with any email and password
 */
let mockSession: any = null;
let mockUser: any = null;

/**
 * Create a mock session and user
 */
function createMockSession(email: string) {
  const mockId = Math.random().toString(36).substring(2, 15);
  const mockToken = `mock_token_${mockId}`;
  
  mockUser = {
    id: mockId,
    email,
    user_metadata: {
      name: email.split('@')[0],
    },
    created_at: new Date().toISOString(),
  };

  mockSession = {
    user: mockUser,
    access_token: mockToken,
    refresh_token: mockToken,
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'Bearer',
  };

  return mockSession;
}

/**
 * Supabase client singleton instance
 *
 * The client is created with:
 * - Custom storage with AsyncStorage fallback for token persistence
 * - Automatic token refresh
 * - Real-time subscriptions enabled
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize or get the Supabase client instance
 *
 * @returns {SupabaseClient} Authenticated Supabase client
 *
 * @example
 * const supabase = getSupabaseClient();
 * const { data, error } = await supabase
 *   .from("households")
 *   .select("*");
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    console.log("[Supabase] Initializing client...");

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: customStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log("[Supabase] Client initialized");

    // Set up auth state change listener
    setupAuthStateListener();
  }

  return supabaseClient;
}

/**
 * Setup listener for authentication state changes
 *
 * This listens for token refresh, login, logout, and other auth events
 */
function setupAuthStateListener(): void {
  const supabase = supabaseClient!;

  // Handle auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Auth] Event: ${event}`, { hasSession: !!session });

    switch (event) {
      case "SIGNED_IN":
        console.log("[Auth] User signed in");
        break;

      case "SIGNED_OUT":
        console.log("[Auth] User signed out");
        break;

      case "TOKEN_REFRESHED":
        console.log("[Auth] Token refreshed");
        break;

      case "USER_UPDATED":
        console.log("[Auth] User profile updated");
        break;

      case "MFA_CHALLENGE_VERIFIED":
        console.log("[Auth] MFA challenge verified");
        break;

      default:
        console.log(`[Auth] Unhandled event: ${event}`);
    }
  });
}

// ============================================================================
// Authentication Methods
// ============================================================================

/**
 * Register a new user with email and password
 *
 * ⚠️  DEMO MODE: Accepts any email and password without database validation
 *
 * @param {string} email - User email
 * @param {string} password - User password (any value accepted)
 * @param {string} name - User display name
 *
 * @returns {Promise<{user, session} | {error}>}
 *
 * @example
 * const { user, error } = await signUp("user@example.com", "anypassword", "John");
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{
  user?: any;
  session?: any;
  error?: Error;
}> {
  try {
    // Demo mode: Accept any email and password
    const session = createMockSession(email);
    
    console.log("[Auth] Sign up successful (DEMO MODE)", { email });
    return { user: session.user, session };
  } catch (err) {
    console.error("[Auth] Sign up exception:", err);
    return { error: err as Error };
  }
}

/**
 * Login with email and password
 *
 * ⚠️  DEMO MODE: Accepts any email and password without database validation
 *
 * @param {string} email - User email
 * @param {string} password - User password (any value accepted)
 *
 * @returns {Promise<{user, session} | {error}>}
 *
 * @example
 * const { user, session, error } = await signIn("user@example.com", "anypassword");
 */
export async function signIn(
  email: string,
  password: string
): Promise<{
  user?: any;
  session?: any;
  error?: Error;
}> {
  try {
    // Demo mode: Accept any email and password
    const session = createMockSession(email);
    
    console.log("[Auth] Sign in successful (DEMO MODE)", { email });
    return { user: session.user, session };
  } catch (err) {
    console.error("[Auth] Sign in exception:", err);
    return { error: err as Error };
  }
}

/**
 * Login with Google OAuth
 *
 * ⚠️  DEMO MODE: Creates mock session with mock email
 *
 * @param {string} googleToken - ID token from Google Sign-In (not validated in demo mode)
 *
 * @returns {Promise<{user, session} | {error}>}
 *
 * @example
 * const { user, session, error } = await signInWithGoogle(googleToken);
 */
export async function signInWithGoogle(
  googleToken: string
): Promise<{
  user?: any;
  session?: any;
  error?: Error;
}> {
  try {
    // Demo mode: Create mock session with fake email
    const mockEmail = `google-${Math.random().toString(36).substring(7)}@google.com`;
    const session = createMockSession(mockEmail);
    
    console.log("[Auth] Google sign in successful (DEMO MODE)");
    return { user: session.user, session };
  } catch (err) {
    console.error("[Auth] Google sign in exception:", err);
    return { error: err as Error };
  }
}

/**
 * Logout the current user
 *
 * @returns {Promise<{error: Error | null}>}
 *
 * @example
 * const { error } = await signOut();
 */
export async function signOut(): Promise<{
  error?: Error;
}> {
  try {
    // Demo mode: Clear mock session
    mockSession = null;
    mockUser = null;
    
    console.log("[Auth] Sign out successful (DEMO MODE)");
    return {};
  } catch (err) {
    console.error("[Auth] Sign out exception:", err);
    return { error: err as Error };
  }
}

/**
 * Get the current session
 *
 * ⚠️  DEMO MODE: Returns mock session if available
 *
 * @returns {Promise<{session} | {error}>}
 *
 * @example
 * const { session, error } = await getSession();
 */
export async function getSession(): Promise<{
  session?: any;
  error?: Error;
}> {
  try {
    // Demo mode: Return mock session if available
    if (mockSession) {
      console.log("[Auth] Returning mock session");
      return { session: mockSession };
    }
    
    return { session: null };
  } catch (err) {
    console.error("[Auth] Get session exception:", err);
    return { error: err as Error };
  }
}

/**
 * Get the current user
 *
 * ⚠️  DEMO MODE: Returns mock user if available
 *
 * @returns {Promise<{user} | {error}>}
 *
 * @example
 * const { user, error } = await getUser();
 */
export async function getUser(): Promise<{
  user?: any;
  error?: Error;
}> {
  try {
    // Demo mode: Return mock user if available
    if (mockUser) {
      console.log("[Auth] Returning mock user");
      return { user: mockUser };
    }
    
    return { user: null };
  } catch (err) {
    console.error("[Auth] Get user exception:", err);
    return { error: err as Error };
  }
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to changes in a table
 *
 * @param {string} tableName - Table to subscribe to
 * @param {string} event - Event type: 'INSERT', 'UPDATE', 'DELETE', or '*' for all
 * @param {Function} callback - Function called when event occurs
 * @param {string} filter - Optional filter (e.g., "household_id=eq.123")
 *
 * @returns {{unsubscribe: Function}} Subscription handle with unsubscribe function
 *
 * @example
 * const subscription = supabaseRealtimesetup.subscribeToTable('chat_messages', '*', (payload) => {
 *   console.log('Message:', payload.new);
 * }, `channel_id=eq.${channelId}`);
 *
 * // Later, unsubscribe:
 * subscription.unsubscribe();
 */
export function subscribeToTable(
  tableName: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: any) => void,
  filter?: string
): { unsubscribe: () => Promise<void> } {
  const supabase = getSupabaseClient();

  let channelName = `public.${tableName}`;
  if (filter) {
    channelName += `:${filter.replace("=", ".")}`;
  }

  console.log(`[Realtime] Subscribing to ${channelName} for ${event}`);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event,
        schema: "public",
        table: tableName,
        filter,
      },
      (payload: any) => {
        console.log(`[Realtime] ${event} on ${tableName}:`, payload);
        callback(payload);
      }
    )
    .subscribe((status: string) => {
      console.log(`[Realtime] Subscription ${status}:`, channelName);
    });

  return {
    unsubscribe: async () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      await supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to chat messages in a channel
 *
 * @param {string} channelId - Chat channel ID
 * @param {Function} callback - Called when new message arrives
 *
 * @returns {{unsubscribe: Function}} Subscription handle
 *
 * @example
 * const sub = supabaseRealtimeSetup.subscribeToChatMessages(channelId, (message) => {
 *   console.log("New message:", message.new);
 * });
 */
export function subscribeToChatMessages(
  channelId: string,
  callback: (payload: any) => void
): { unsubscribe: () => Promise<void> } {
  return subscribeToTable(
    "chat_messages",
    "INSERT",
    callback,
    `channel_id=eq.${channelId}`
  );
}

/**
 * Subscribe to task assignments in a household
 *
 * @param {string} householdId - Household ID
 * @param {Function} callback - Called when task assignment changes
 *
 * @returns {{unsubscribe: Function}} Subscription handle
 *
 * @example
 * const sub = supabaseRealtimeSetup.subscribeToTaskAssignments(householdId, (payload) => {
 *   console.log("Task:", payload.new);
 * });
 */
export function subscribeToTaskAssignments(
  householdId: string,
  callback: (payload: any) => void
): { unsubscribe: () => Promise<void> } {
  return subscribeToTable(
    "task_assignments",
    "*",
    callback,
    `household_id=eq.${householdId}`
  );
}

/**
 * Subscribe to task completions in a household
 *
 * @param {string} householdId - Household ID
 * @param {Function} callback - Called when task is completed
 *
 * @returns {{unsubscribe: Function}} Subscription handle
 *
 * @example
 * const sub = supabaseRealtimeSetup.subscribeToTaskCompletions(householdId, (payload) => {
 *   console.log("Completed:", payload.new);
 * });
 */
export function subscribeToTaskCompletions(
  householdId: string,
  callback: (payload: any) => void
): { unsubscribe: () => Promise<void> } {
  return subscribeToTable(
    "task_completions",
    "INSERT",
    callback,
    `household_id=eq.${householdId}`
  );
}

// ============================================================================
// Database Query Helpers
// ============================================================================

/**
 * Helper to make authenticated queries to the database
 *
 * This is a low-level helper. Use higher-level APIs for specific features.
 *
 * @param {Function} queryFn - Function that takes supabase client and returns promise
 *
 * @returns {Promise<any>} Query result
 *
 * @example
 * const households = await query(async (supabase) => {
 *   const { data, error } = await supabase
 *     .from("households")
 *     .select("*");
 *   if (error) throw error;
 *   return data;
 * });
 */
export async function query<T>(
  queryFn: (supabase: SupabaseClient) => Promise<T>
): Promise<T> {
  try {
    const supabase = getSupabaseClient();
    const result = await queryFn(supabase);
    return result;
  } catch (err) {
    console.error("[Database] Query failed:", err);
    throw err;
  }
}

/**
 * Get the access token for manual API calls
 *
 * @returns {Promise<string | null>} JWT access token or null if not authenticated
 *
 * @example
 * const token = await getAccessToken();
 * if (token) {
 *   // Use token in API calls
 *   const response = await fetch('https://api.example.com/users/me', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 *   });
 * }
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { session, error } = await getSession();
    if (error || !session) {
      return null;
    }
    return session.access_token;
  } catch (err) {
    console.error("[Auth] Failed to get access token:", err);
    return null;
  }
}

// Export Supabase client type for TypeScript usage
export type { SupabaseClient };

// Export the getSupabaseClient function as default
export default getSupabaseClient;
