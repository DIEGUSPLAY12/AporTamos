/**
 * Login Screen Route
 *
 * This route imports and renders the LoginScreen component from
 * AporTamos-Frontend/components/auth/LoginScreen.tsx
 *
 * The LoginScreen component provides:
 * - Email and password input fields
 * - Login button with error handling
 * - Google OAuth button for single-sign-on
 * - Link to registration for new users
 * - Link to password reset for forgotten passwords
 * - Form validation
 * - Loading states
 *
 * Integration:
 * - Uses useAuth hooks for authentication
 * - Uses Supabase client for session management
 * - Handles validation errors and server errors
 * - Auto-navigates to home on successful login
 */

import LoginScreen from '@/components/auth/LoginScreen';

export default LoginScreen;
