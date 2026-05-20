/**
 * API Service for AporTamos Backend Communication
 *
 * Provides typed HTTP client for communicating with FastAPI backend.
 * Handles authentication, error handling, and response parsing.
 *
 * Features:
 * - Bearer token authentication
 * - Automatic error handling
 * - Request/response logging
 * - Type-safe API calls
 * - Timeout handling
 * - Retry logic for network errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HouseholdDetail,
  Household,
  CreateHouseholdRequest,
  InviteMemberRequest,
  WeeklyTaskScheduleResponse,
  CreateWeeklyTaskScheduleRequest,
} from '@/types/models';

/**
 * API Configuration
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;

/**
 * Error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get stored authentication token
 *
 * @returns {Promise<string | null>} JWT token or null if not found
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    return token || null;
  } catch (error) {
    console.error('[API] Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Build authorization headers
 *
 * @returns {Promise<HeadersInit>} Headers object with authorization
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make HTTP request with error handling and retry logic
 *
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {RequestInit} options - Fetch options
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Response>} Fetch response
 */
async function request(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: await getAuthHeaders(),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        data.detail || `HTTP ${response.status}`,
        data
      );
    }

    return response;
  } catch (error) {
    // Retry on network errors
    if (error instanceof TypeError && retryCount < MAX_RETRIES) {
      console.warn(`[API] Request failed, retrying... (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return request(endpoint, options, retryCount + 1);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
}

/**
 * GET request helper
 *
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Parsed JSON response
 */
export async function get(endpoint: string): Promise<any> {
  const response = await request(endpoint, {
    method: 'GET',
  });
  return response.json();
}

/**
 * POST request helper
 *
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
export async function post(endpoint: string, data: any): Promise<any> {
  const response = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * PATCH request helper
 *
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
export async function patch(endpoint: string, data: any): Promise<any> {
  const response = await request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * DELETE request helper
 *
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Parsed JSON response (may be empty)
 */
export async function del(endpoint: string): Promise<any> {
  const response = await request(endpoint, {
    method: 'DELETE',
  });

  // 204 No Content returns no body
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

/**
 * Household API Methods
 */

/**
 * Fetch household details and members
 *
 * @param {string} householdId - Household ID
 * @returns {Promise<HouseholdDetail>} Household data with members
 *
 * @example
 * const household = await getHouseholdDetails('abc-123');
 * console.log(household.name, household.members.length);
 */
export async function getHouseholdDetails(householdId: string): Promise<HouseholdDetail> {
  return get(`/households/${householdId}`);
}

/**
 * Fetch list of households for current user
 *
 * @returns {Promise<Household[]>} Array of user's households
 *
 * @note This endpoint (GET /users/{user_id}/households) needs to be implemented
 * in the backend as part of T049 implementation. For now, returns empty array.
 *
 * @example
 * const households = await getUserHouseholds();
 */
export async function getUserHouseholds(): Promise<Household[]> {
  try {
    // TODO: Implement GET /users/{user_id}/households endpoint in backend
    // This endpoint should return list of all households user is member of
    // For now, return empty array - will be updated when backend endpoint available
    console.warn('[API] getUserHouseholds: Backend endpoint not yet implemented');
    return [];
  } catch (error) {
    console.error('[API] Failed to fetch user households:', error);
    throw error;
  }
}

/**
 * Create a new household
 *
 * @param {CreateHouseholdRequest} data - Household creation data
 * @returns {Promise<Household>} Created household
 */
export async function createHousehold(data: CreateHouseholdRequest): Promise<Household> {
  return post('/households', data);
}

/**
 * Invite member to household by email
 *
 * @param {string} householdId - Household ID
 * @param {InviteMemberRequest} data - Invitation data (email)
 * @returns {Promise<any>} Invitation response
 */
export async function inviteMember(
  householdId: string,
  data: InviteMemberRequest
): Promise<any> {
  return post(`/households/${householdId}/members`, data);
}

/**
 * Accept household invitation
 *
 * @param {string} householdId - Household ID
 * @param {string} userId - User ID
 * @returns {Promise<any>} Acceptance response
 */
export async function acceptInvitation(
  householdId: string,
  userId: string
): Promise<any> {
  return patch(`/households/${householdId}/members/${userId}`, {
    action: 'accept',
  });
}

/**
 * Remove member from household
 *
 * @param {string} householdId - Household ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<any>} Removal response
 */
export async function removeMember(
  householdId: string,
  userId: string
): Promise<any> {
  return del(`/households/${householdId}/members/${userId}`);
}

/**
 * Schedule API Methods
 */

export async function getSchedule(householdId: string): Promise<WeeklyTaskScheduleResponse> {
  return get(`/households/${householdId}/schedule`);
}

export async function createSchedule(
  householdId: string,
  data: CreateWeeklyTaskScheduleRequest,
): Promise<WeeklyTaskScheduleResponse> {
  return post(`/households/${householdId}/schedule`, data);
}

export async function updateSchedule(
  householdId: string,
  data: CreateWeeklyTaskScheduleRequest,
): Promise<WeeklyTaskScheduleResponse> {
  return post(`/households/${householdId}/schedule`, data);
}

/**
 * Task API Methods
 */

export interface TaskSummaryItem {
  task_id: string;
  assignment_id: string;
  name: string;
  effort_weight: number;
  is_completed: boolean;
  assigned_to: string;
  assignment_date: string;
  photo_url?: string;
  completed_at?: string;
}

export interface TaskListResponse {
  date: string;
  household_id: string;
  household_name: string;
  daily_completion_pct: number;
  tasks: TaskSummaryItem[];
}

export interface TaskCompletionResponse {
  id: string;
  assignment_id: string;
  user_id: string;
  photo_url: string;
  completed_at: string;
}

export async function getUserTasks(
  householdId: string,
  date?: string
): Promise<TaskListResponse> {
  const query = date ? `?date=${date}` : '';
  return get(`/households/${householdId}/tasks${query}`);
}

export async function getHouseholdTasks(
  householdId: string,
  date?: string
): Promise<TaskListResponse> {
  const query = date ? `?date=${date}` : '';
  return get(`/households/${householdId}/tasks/all${query}`);
}

export default {
  get,
  post,
  patch,
  del,
  getUserHouseholds,
  getHouseholdDetails,
  createHousehold,
  inviteMember,
  acceptInvitation,
  removeMember,
  getSchedule,
  createSchedule,
  updateSchedule,
};
