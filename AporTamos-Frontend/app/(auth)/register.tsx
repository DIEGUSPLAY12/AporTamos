/**
 * Register Screen Route
 *
 * This route imports and renders the RegisterScreen component from
 * AporTamos-Frontend/components/auth/RegisterScreen.tsx
 *
 * The RegisterScreen component provides:
 * - Name, email, and password input fields
 * - Password confirmation field
 * - Register button with comprehensive form validation
 * - Password strength indicator
 * - Requirements display for password
 * - Terms & Conditions checkbox
 * - Login link for existing users
 * - Google OAuth registration option
 * - Loading states
 *
 * Integration:
 * - Uses useRegister hook for user registration
 * - Uses Supabase client for session management
 * - Validates email format, password strength, password match
 * - Handles validation errors and server errors
 * - Auto-navigates to home on successful registration
 */

import RegisterScreen from '@/components/auth/RegisterScreen';

export default RegisterScreen;
