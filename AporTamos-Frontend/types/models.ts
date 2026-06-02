/**
 * Shared TypeScript types for AporTamos API
 * Generated from API contracts and data model
 * https://specs/001-household-tasks/contracts/
 */

/**
 * Authentication and User Types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface AuthResponse extends AuthToken {
  refresh_token?: string;
}

export interface GoogleAuthResponse extends AuthToken {
  is_new_user: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  google_token: string;
}

export interface UpdateUserRequest {
  name?: string;
  preferred_timezone?: string;
}

/**
 * Household Types
 */

export type HouseholdRole = "owner" | "member";

export interface HouseholdMember {
  user_id: string;
  name: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface Household {
  id: string;
  owner_id: string;
  name: string;
  timezone_id: string;
  daily_streak: number;
  last_completion_date?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdDetail extends Household {
  members: HouseholdMember[];
}

export interface CreateHouseholdRequest {
  name: string;
  timezone_id: string;
}

export interface InviteMemberRequest {
  email: string;
  /** Environment-correct deep link the email should open (computed via expo-linking). */
  join_link?: string;
}

export interface InviteMemberResponse {
  message: string;
}

export interface AcceptInvitationRequest {
  action: "accept";
  role: HouseholdRole;
}

export interface AcceptInvitationResponse {
  message: string;
}

/**
 * Task Schedule Types
 */

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type AssignmentType = "explicit" | "random";
export type TaskFrequency = "daily" | "weekly";

export interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  day_of_week: DayOfWeek;
  effort_weight: number; // 1-10
  assignment_type: AssignmentType;
  assigned_user_id?: string;
  frequency: TaskFrequency;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDefinition {
  name: string;
  description?: string;
  day_of_week: DayOfWeek;
  effort_weight: number; // 1-10
  assignment_type: AssignmentType;
  assigned_user_id?: string | null;
  frequency?: TaskFrequency;
}

export interface WeeklyTaskSchedule {
  id: string;
  household_id: string;
  version: number;
  tasks: TaskDefinition[];
  created_at: string;
  updated_at: string;
  active_from: string;
  active_until?: string;
}

export interface CreateScheduleRequest {
  tasks: CreateTaskDefinition[];
}

export interface UpdateScheduleRequest {
  tasks: CreateTaskDefinition[];
}

/**
 * Task Assignment Types
 */

export interface TaskAssignment {
  id: string;
  task_id: string;
  household_id: string;
  assigned_to_user_id: string;
  assignment_date: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignmentDetail extends TaskAssignment {
  task: TaskDefinition;
}

/**
 * Task Completion Types
 */

export interface TaskCompletion {
  id: string;
  assignment_id: string;
  completed_by_user_id: string;
  completion_date: string;
  photo_urls: string[];
  notes?: string;
  created_at: string;
}

export interface CreateCompletionRequest {
  photo_urls?: string[];
  notes?: string;
}

/**
 * Chat Types
 */

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  message_type: "text" | "image" | "audio";
  content: string;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateMessageRequest {
  message_type: "text" | "image" | "audio";
  content: string;
  media_urls?: string[];
}

export interface ChatChannel {
  id: string;
  household_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * API Response Types
 */

export interface ApiError {
  error_code: string;
  message: string;
  details?: Record<string, any>;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Gamification Types
 */

export interface HouseholdStats {
  household_id: string;
  daily_streak: number;
  completion_percentage: number;
  last_completion_date?: string;
  total_tasks_completed: number;
  total_tasks_assigned: number;
}

export interface UserStats {
  user_id: string;
  household_id: string;
  tasks_completed: number;
  tasks_assigned: number;
  completion_rate: number;
}

/**
 * Storage/File Types
 */

export interface UploadResponse {
  path: string;
  url: string;
  size: number;
  created_at: string;
}

export interface FileUploadRequest {
  file: File;
  bucket: "task-proofs" | "chat-media";
  path?: string;
}

/**
 * State Management Types
 */

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

export interface HouseholdState {
  selectedHousehold: Household | null;
  households: Household[];
  members: HouseholdMember[];
  schedule: WeeklyTaskSchedule | null;
  isLoading: boolean;
  error: string | null;
}

export interface TaskState {
  dailyAssignments: TaskAssignment[];
  userAssignments: TaskAssignment[];
  completions: TaskCompletion[];
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  household: HouseholdState;
  tasks: TaskState;
}

/**
 * Form Types
 */

export interface FormError {
  field: string;
  message: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: FormError[];
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Real-time Event Types
 */

export type RealtimeEventType =
  | "task_completed"
  | "task_assigned"
  | "message_received"
  | "user_joined"
  | "user_left"
  | "household_updated"
  | "schedule_updated";

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  timestamp: string;
  data: T;
  source: "server" | "local";
}

/**
 * Utility Types
 */

export type AsyncResult<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError };

export interface PageParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// Type aliases used by ScheduleEditor and useTasks hooks
export type WeeklyTaskScheduleResponse = WeeklyTaskSchedule;
export type CreateWeeklyTaskScheduleRequest = CreateScheduleRequest;
export type TaskCreate = CreateTaskDefinition;
export type TaskAssignmentResponse = TaskAssignmentDetail;

export interface TaskListResponse {
  date: string;
  household_id: string;
  household_name: string;
  daily_completion_pct: number;
  tasks: TaskAssignmentDetail[];
}
