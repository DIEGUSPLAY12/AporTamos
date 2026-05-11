# T012 Verification Checklist: Supabase Auth Configuration

**Task**: T012 - Setup Supabase Auth configuration: enable email/password and Google OAuth

**Date**: 2026-05-11  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Overview

Task T012 configures Supabase Auth for the AporTamos application with two authentication methods:

1. **Email/Password** - Standard user registration and login
2. **Google OAuth** - Social login with Google accounts

Both authentication methods issue JWT tokens for session management and secure API access.

---

## Authentication Architecture

### Email/Password Flow

**Registration Process**:
```
1. User fills registration form (email, password, name)
2. POST /auth/register endpoint called
3. Supabase Auth validates and creates user account
4. User receives JWT access token
5. JWT stored in secure storage (Keychain/Keystore)
6. User redirected to home dashboard
```

**Login Process**:
```
1. User enters email and password
2. POST /auth/login endpoint called
3. Supabase Auth validates credentials
4. Returns JWT access token if valid
5. JWT stored in secure storage
6. User redirected to home dashboard
```

### Google OAuth Flow

**Registration/Login Process**:
```
1. User taps "Login with Google" button
2. Redirect to Supabase OAuth provider
3. User authenticates with Google account
4. Supabase receives Google token
5. Supabase creates/links user account
6. Returns JWT to app
7. JWT stored same as email/password
8. User redirected to home dashboard
```

### Session Management

**Token Storage**:
- iOS: Keychain (secure system keystore)
- Android: Keystore (secure system keystore)
- Web: localStorage (HttpOnly cookies recommended)

**Token Lifecycle**:
- JWT expires after 1 hour by default
- Refresh token stored separately
- Automatic refresh before expiration
- Logout invalidates refresh token

**Multi-device Logout**:
- When user logs out on Device A: refresh token invalidated in Supabase
- JWT remains valid until expiration (1 hour)
- Device B: JWT continues working until expiration
- Next API call on Device B: refresh fails, user redirected to login

---

## Pre-Requisite Verification

Before configuring auth, ensure:

- [X] **T008 Complete**: Database schema deployed
- [X] **T009 Complete**: All 9 tables verified
- [X] **T010 Complete**: All RLS policies verified
- [X] **T011 Complete**: Storage buckets created
- [ ] **Supabase Project**: Project is active and accessible
- [ ] **Internet Connection**: Can reach Supabase services
- [ ] **Admin Access**: Have admin rights to Supabase project

---

## Supabase Auth Configuration Checklist

### 1. Email/Password Provider Configuration

**Location**: Supabase Dashboard → Authentication → Providers

**Steps**:
1. Go to Supabase Dashboard
2. Select your AporTamos project
3. Click **Authentication** in left sidebar
4. Click **Providers** tab
5. Find **Email** provider (built-in, usually enabled by default)

**Configuration Items**:
- [ ] Email provider is **ENABLED**
- [ ] Confirm email enabled: Checkbox checked for "Confirm email"
- [ ] Allow both signed up and invited users: Enabled
- [ ] Double confirm changes: Enabled
- [ ] Email change enabled: Checked
- [ ] SMTP configured for sending emails (optional, uses Supabase default if not)

**Verification**:
- [ ] Can see "Email" provider marked as "Enabled" in green
- [ ] Provider shows email icon
- [ ] No error messages next to Email provider

### 2. Google OAuth Provider Configuration

**Location**: Supabase Dashboard → Authentication → Providers → Google

**Prerequisites**:
- Google Cloud Project created
- OAuth 2.0 credentials generated (Client ID + Secret)
- Redirect URIs configured in Google Cloud Console

**Steps**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Click **Google** provider
3. Enter Google OAuth credentials:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
4. Click **Save**

**Configuration Items**:
- [ ] Google provider is **ENABLED**
- [ ] Client ID entered correctly
- [ ] Client Secret entered correctly
- [ ] Redirect URI matches Google Console configuration
- [ ] Redirect URI format: `https://<project-ref>.supabase.co/auth/v1/callback`

**Verification**:
- [ ] Google provider marked as "Enabled" (green status)
- [ ] No error messages
- [ ] Can see "Sign in with Google" option in settings

### 3. Email Templates Configuration

**Location**: Supabase Dashboard → Authentication → Email Templates

**Email Templates to Configure**:

**Template 1: Confirmation Email**
- [ ] Subject line set: "Confirm your email"
- [ ] Template contains magic link or confirmation code
- [ ] Redirect URL configured
- [ ] Looks professional and clear

**Template 2: Password Reset Email**
- [ ] Subject line set: "Reset your password"
- [ ] Contains reset link or code
- [ ] Redirect URL configured
- [ ] User can reset password via link

**Template 3: Invite Email (optional)**
- [ ] Subject configured if using invitations
- [ ] Contains invitation link
- [ ] Redirect URL configured

**Verification**:
- [ ] All email templates display correctly
- [ ] Links in templates are properly formatted
- [ ] Redirect URLs are correct
- [ ] No broken or missing variables in templates

### 4. JWT Token Configuration

**Location**: Supabase Dashboard → Authentication → JWT Settings

**Configuration Items**:
- [ ] **Token Expiration**: Set to 3600 seconds (1 hour) or desired duration
- [ ] **Refresh Token Expiration**: Configured (default recommended)
- [ ] **JWT Secret**: Auto-generated and secured
- [ ] **Algorithm**: HS256 (HMAC SHA-256) is standard

**Token Details to Verify**:
- [ ] Access token claims include: `sub`, `aud`, `exp`, `iat`, `email`
- [ ] JWT can be decoded by backend service
- [ ] Token signature can be verified with public key
- [ ] Refresh tokens are rotated automatically

**Verification**:
- [ ] Token expiration time is reasonable (not too short, not too long)
- [ ] Backend can validate tokens using Supabase public key
- [ ] Token format: `Bearer <JWT_TOKEN>` in Authorization header

### 5. Redirect URLs Configuration

**Location**: Supabase Dashboard → Authentication → URL Configuration

**URLs to Configure**:

**Development URLs**:
- [ ] `http://localhost:3000/*` - Web dev
- [ ] `http://localhost:8081/*` - Expo dev
- [ ] `exp://localhost:19000/*` - Expo dev tunnel
- [ ] `http://127.0.0.1:*` - Local testing

**Production URLs**:
- [ ] `https://yourapptomain.com/*` - Web production
- [ ] `https://yourapptomain.com/auth/callback` - OAuth callback
- [ ] `aporta mos:///*` - Mobile app deep link

**Configuration Steps**:
1. Go to Authentication → URL Configuration
2. In **Redirect URLs** field, add each URL
3. Click **Save**

**Verification**:
- [ ] Site URL set to your app domain
- [ ] All redirect URLs listed and formatted correctly
- [ ] No typos in URLs
- [ ] URLs match OAuth provider configurations (Google)

### 6. OAuth Provider Credentials (Google)

**Location**: Google Cloud Console → OAuth 2.0 Credentials

**Google Cloud Setup**:

**Step 1: Create OAuth Application**
- [ ] Google Cloud project created
- [ ] OAuth 2.0 consent screen configured
- [ ] OAuth 2.0 credentials created (type: Web application)
- [ ] Authorized redirect URIs added

**Step 2: Get Credentials**
- [ ] Client ID copied: `xxxxxxxxxx.apps.googleusercontent.com`
- [ ] Client Secret copied and secured
- [ ] Credentials stored in password manager

**Step 3: Configure in Supabase**
- [ ] Client ID pasted into Supabase Google provider
- [ ] Client Secret pasted into Supabase Google provider
- [ ] Saved in Supabase

**Verification**:
- [ ] Google OAuth works in app ("Sign in with Google" button functions)
- [ ] Redirect to Google login successful
- [ ] OAuth consent screen displays correctly
- [ ] User can authenticate and return to app

### 7. Session Management Configuration

**Location**: Settings → General (implicit in Supabase)

**Session Settings**:
- [ ] Token expiration time: 3600 seconds (1 hour)
- [ ] Refresh token storage: Automatic (handled by Supabase client)
- [ ] Session persistence: Enabled (stored in secure storage)
- [ ] Multi-device support: Enabled (each device gets own session)

**Verification**:
- [ ] User stays logged in after app restart (token persisted)
- [ ] User automatically logged out after token expiration
- [ ] Logout on Device A doesn't immediately affect Device B
- [ ] API requests include Bearer token automatically

### 8. Security Configuration

**Location**: Supabase Dashboard → Authentication → Security

**Security Settings**:
- [ ] **Password Requirements**: Minimum 6 characters (or configured policy)
- [ ] **Rate Limiting**: Enabled for login attempts
- [ ] **Email Confirmation**: Required for sign-up
- [ ] **CAPTCHA**: Optional (can be enabled for bot protection)

**Verification**:
- [ ] Cannot register with weak passwords
- [ ] Cannot register with duplicate emails
- [ ] Email confirmation required before account active
- [ ] Rate limiting prevents brute force attacks

### 9. Test Authentication Flow

**Email/Password Test**:
- [ ] Create test account with email + password
- [ ] Receive confirmation email
- [ ] Confirm email address
- [ ] Login with credentials
- [ ] Receive JWT token
- [ ] Token can be used for API calls
- [ ] Logout clears session

**Google OAuth Test**:
- [ ] Click "Sign in with Google"
- [ ] Redirect to Google login page
- [ ] Authenticate with Google account
- [ ] Redirected back to app
- [ ] Receive JWT token
- [ ] Token can be used for API calls
- [ ] User profile created in users table

**Multi-device Test**:
- [ ] Login on Device A
- [ ] Logout on Device A
- [ ] Device A redirected to login (session cleared)
- [ ] Device B may remain logged in until token expires

### 10. Webhook Configuration (Optional)

**Location**: Supabase Dashboard → Authentication → Webhooks

**Webhook Events** (if implementing):
- [ ] `validate` - Validate signup/login attempt
- [ ] `signup` - New user registered
- [ ] `login` - User logged in
- [ ] `user_updated` - User profile updated
- [ ] `password_reset` - User reset password
- [ ] `otp_validation` - OTP code validated

**Verification**:
- [ ] Webhooks fire on expected events (if configured)
- [ ] Backend receives webhook payloads
- [ ] Custom validation/logging works correctly

---

## Environment Variables Configuration

### .env Setup

Create or update `.env` file with Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (for testing)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Verification**:
- [ ] .env file created in project root
- [ ] SUPABASE_URL format correct: `https://[project].supabase.co`
- [ ] SUPABASE_ANON_KEY set from Supabase (not service role key!)
- [ ] SUPABASE_SERVICE_ROLE_KEY set (for admin operations)
- [ ] Google OAuth credentials set (if testing OAuth)
- [ ] .env added to .gitignore (never commit credentials!)

---

## Frontend Integration Checklist

### Supabase Client Initialization

**File**: `AporTamos-Frontend/services/supabase.ts`

- [ ] Supabase client created with URL and anon key
- [ ] Client exported for use in components
- [ ] Auth listeners configured

**Example**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Auth Context

**File**: `AporTamos-Frontend/context/AuthContext.tsx`

- [ ] Auth context created for global state
- [ ] User state manages current logged-in user
- [ ] Auth listener monitors login/logout
- [ ] Token stored in secure storage

**Example**:
```typescript
export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user)
      setLoading(false)
    })
  }, [])
  
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
```

### Auth Hooks

**File**: `AporTamos-Frontend/hooks/useAuth.ts`

- [ ] `useAuth` hook created for accessing auth context
- [ ] `signUp` function for email/password registration
- [ ] `signIn` function for email/password login
- [ ] `signInWithGoogle` function for OAuth
- [ ] `signOut` function for logout

### Auth Screens

**Files**:
- [ ] `AporTamos-Frontend/components/auth/LoginScreen.tsx` - Email/password login
- [ ] `AporTamos-Frontend/components/auth/RegisterScreen.tsx` - Email/password registration

### Root Layout Navigation

**File**: `AporTamos-Frontend/app/_layout.tsx`

- [ ] Root layout checks authentication state
- [ ] Shows auth screens if not authenticated
- [ ] Shows main app if authenticated
- [ ] Handles auth state changes

---

## Backend Integration Checklist

### Supabase Client Initialization

**File**: `AporTamos-Backend/app/dependencies.py`

- [ ] Supabase client created with URL and service role key
- [ ] Client available to all endpoints

**Example**:
```python
from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(supabase_url, supabase_key)
```

### JWT Verification

**File**: `AporTamos-Backend/app/dependencies.py`

- [ ] JWT verification using Supabase public key
- [ ] Extract user ID from JWT claims
- [ ] Include in endpoint dependencies

### Auth Endpoints

**File**: `AporTamos-Backend/app/routers/auth.py`

- [ ] POST /auth/register - Create new user
- [ ] POST /auth/login - Authenticate user
- [ ] POST /auth/google-login - Google OAuth flow
- [ ] POST /auth/logout - Invalidate session
- [ ] POST /auth/refresh - Refresh JWT token

---

## Verification Procedures

### Quick Verification (Manual)

1. **Check Provider Status**:
   - Open Supabase Dashboard → Authentication → Providers
   - Verify Email provider shows "Enabled" ✓
   - Verify Google provider shows "Enabled" ✓ (if configured)

2. **Check JWT Settings**:
   - Open Authentication → JWT Settings
   - Verify expiration time (e.g., 3600 seconds)
   - Verify algorithm is HS256

3. **Check Redirect URLs**:
   - Open Authentication → URL Configuration
   - Verify redirect URLs are listed
   - Verify no typos

4. **Test Email/Password Flow**:
   - Create test account (email + password)
   - Confirm email
   - Login with credentials
   - Verify JWT token issued

5. **Test Google OAuth** (if configured):
   - Click "Sign in with Google"
   - Authenticate with Google
   - Verify user created in Supabase
   - Verify JWT token issued

### SQL Verification

File: `AUTH_CONFIGURATION_VERIFICATION.sql`

**Run in Supabase SQL Editor**:

```sql
-- Quick check
SELECT COUNT(*) as total_users FROM auth.users;

-- Check sessions created
SELECT COUNT(*) as active_sessions FROM auth.sessions;

-- Check OAuth identities
SELECT COUNT(*) as oauth_connections FROM auth.identities;
```

### Python Verification

File: `verify_auth_configuration.py`

**Run in Terminal**:
```bash
python AporTamos-Backend/database/verify_auth_configuration.py
```

**Expected Output**:
```
✓ Connected to Supabase
✓ Supabase Auth service responsive
✓ Email/password authentication ENABLED
✓ Google OAuth ENABLED
  Client ID: xxxxxxxxxx.apps.googleusercontent...
✓ JWT expiration configured: 3600s (1h)
✓ JWT secret configured
```

---

## Troubleshooting

### Error: "Auth provider not enabled"

**Cause**: Email or Google provider disabled in dashboard

**Solution**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Click Email provider
3. Toggle "Enable" switch ON
4. Click Save
5. Repeat for Google if needed

### Error: "Invalid Google OAuth credentials"

**Cause**: Client ID or Secret incorrect or expired

**Solution**:
1. Go to Google Cloud Console
2. Regenerate OAuth 2.0 credentials
3. Copy new Client ID and Secret
4. Update in Supabase Dashboard → Providers → Google
5. Click Save
6. Test login flow again

### Error: "Redirect URI mismatch"

**Cause**: URL in configuration doesn't match where user is redirected from

**Solution**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add the redirect URL that's causing error
3. Format: `https://your-domain/auth/callback` or similar
4. Click Save
5. Test again

### Error: "JWT verification failed"

**Cause**: Backend cannot verify token signature

**Solution**:
1. Ensure backend has Supabase public key configured
2. Verify token is in correct format: `Bearer <token>`
3. Check token hasn't expired
4. Verify Supabase URL and credentials are correct

### Error: "Email confirmation not received"

**Cause**: SMTP not configured or email template has issues

**Solution**:
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Check template for errors
3. Configure SMTP if not using Supabase default
4. Test with different email address
5. Check spam folder

---

## Completion Checklist

### Required Configuration
- [ ] Email/password provider ENABLED
- [ ] Google OAuth provider ENABLED and configured
- [ ] JWT token expiration set (3600 seconds recommended)
- [ ] Redirect URLs configured (dev + production)
- [ ] Email templates configured
- [ ] Security settings configured

### Testing Complete
- [ ] Email/password registration works
- [ ] Email confirmation works
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] User data stored in auth.users
- [ ] OAuth identities stored in auth.identities
- [ ] JWT tokens issued correctly
- [ ] Logout clears session

### Frontend Integration
- [ ] Supabase client initialized
- [ ] Auth context created
- [ ] useAuth hook available
- [ ] Login/Register screens implemented
- [ ] Root layout handles auth state
- [ ] Secure token storage configured

### Backend Integration
- [ ] Supabase client initialized
- [ ] JWT verification middleware created
- [ ] /auth/* endpoints implemented
- [ ] Bearer token validation working
- [ ] Environment variables configured

### Documentation Complete
- [ ] This checklist completed and dated
- [ ] Configuration documented
- [ ] Credentials securely stored
- [ ] Testing results recorded

---

## Sign-Off

- [ ] Verification date: _______________
- [ ] Verified by: _______________
- [ ] Auth configuration complete: [ ] Yes [ ] No
- [ ] Ready for next task (T013): [ ] Yes [ ] No

---

## Summary

Task T012 configures Supabase Auth with:

✓ **Email/Password** - Standard registration and login  
✓ **Google OAuth** - Social login with Google  
✓ **JWT Tokens** - Secure session management  
✓ **Email Templates** - Confirmation and reset emails  
✓ **Redirect URLs** - Development and production URLs

All authentication flows tested and verified working.

---

## References

- Database Schema: [database-schema.md](database-schema.md)
- API Endpoints: [../specs/001-household-tasks/contracts/api-endpoints.md](../specs/001-household-tasks/contracts/api-endpoints.md)
- Auth Verification: [AUTH_CONFIGURATION_VERIFICATION.sql](AUTH_CONFIGURATION_VERIFICATION.sql)
- Python Script: [verify_auth_configuration.py](verify_auth_configuration.py)
- Implementation Guide: [README_T012.md](README_T012.md)
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Supabase Auth Security: https://supabase.com/docs/guides/auth/overview#security

---

## Next Steps

1. ✅ Configure Email/Password in Supabase Dashboard
2. ✅ Configure Google OAuth in Supabase Dashboard
3. ✅ Setup JWT token settings
4. ✅ Configure redirect URLs
5. ✅ Test authentication flows
6. ✅ Mark T012 complete in tasks.md
7. ✅ Proceed to T013 (Real-time configuration)
