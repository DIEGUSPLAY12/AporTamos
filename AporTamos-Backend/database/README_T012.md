# T012 Implementation Guide: Supabase Auth Configuration

**Task**: T012 - Setup Supabase Auth configuration: enable email/password and Google OAuth

**Feature**: AporTamos 001-household-tasks  
**Phase**: Phase 2: Foundational Infrastructure  
**Status**: Implementation documentation

---

## Overview

Task T012 configures Supabase Authentication for the AporTamos platform with two authentication methods:

1. **Email/Password** - Standard user registration and login
2. **Google OAuth** - Social login functionality

These authentication methods form the foundation for all user identity and session management in the application.

---

## Deliverables

This task provides:

1. **verify_auth_configuration.py** - Automated auth configuration verification script
2. **AUTH_CONFIGURATION_VERIFICATION.sql** - SQL queries for manual verification
3. **T012_AUTH_CONFIGURATION_CHECKLIST.md** - Comprehensive configuration checklist
4. **README_T012.md** - This implementation guide

---

## Requirements

### Supabase Project Setup

Ensure your Supabase project is active:
- Project must be created in Supabase Dashboard
- Project URL format: `https://[project-ref].supabase.co`
- Service role key must be available

### Google OAuth Setup (Optional for Development)

For Google OAuth support:
- Google Cloud project must be created
- OAuth 2.0 credentials generated (Web application type)
- Client ID and Secret obtained from Google Cloud Console
- Authorized redirect URIs configured in Google Console

### Environment Configuration

Create or update `.env` file in project root:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (for testing)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Supabase Auth Architecture

### Email/Password Authentication

**Components**:
- Built-in Email provider (always available in Supabase)
- Password hashing with bcrypt
- Email confirmation workflow
- Password reset functionality

**Flow**:
```
User Registration:
1. Email + Password submitted
2. Supabase validates (unique email, password strength)
3. Password hashed with bcrypt
4. User record created in auth.users
5. Confirmation email sent
6. User confirms email
7. Account activated

User Login:
1. Email + Password submitted
2. Supabase validates credentials
3. JWT access token generated
4. JWT + Refresh token returned to app
5. App stores in secure storage
```

### Google OAuth Authentication

**Components**:
- Supabase OAuth provider for Google
- OAuth 2.0 protocol (authorization code flow)
- Google identity verification
- Automatic user creation/linking

**Flow**:
```
User Registration/Login via Google:
1. User clicks "Sign in with Google"
2. App redirects to Supabase OAuth endpoint
3. Supabase redirects to Google login
4. User authenticates with Google
5. Google redirects back to Supabase with authorization code
6. Supabase exchanges code for Google token
7. Supabase verifies token with Google
8. Supabase creates/links user account
9. Supabase issues JWT to app
10. App stores JWT securely
```

---

## Configuration Methods

### Method 1: Supabase Dashboard (Recommended)

**Purpose**: Manual configuration with visual interface  
**Time**: 5-10 minutes  
**Difficulty**: ⭐ Easy

#### Email/Password Configuration

1. Open Supabase Dashboard → Select project
2. Click **Authentication** in left sidebar
3. Click **Providers** tab
4. Find and click **Email** provider
5. Ensure "Confirm email" is checked
6. Click **Save**

#### Google OAuth Configuration

**Prerequisites**: Google OAuth credentials must be obtained first

1. In Supabase Dashboard → Authentication → Providers
2. Find and click **Google** provider
3. Enter:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Click **Save**
5. Verify status shows "Enabled" (green)

#### JWT Configuration

1. Go to Authentication → JWT Settings
2. Review default settings:
   - Expiration: 3600 seconds (1 hour) ✓
   - Algorithm: HS256 ✓
   - Secret: Auto-generated ✓
3. Adjust expiration if needed (keep between 1h-24h)
4. Click **Save** if modified

#### Redirect URLs Configuration

1. Go to Authentication → URL Configuration
2. In **Site URL**, enter: `https://your-domain.com`
3. In **Redirect URLs**, add all valid callback URLs:
   - Development: `http://localhost:3000/*`
   - Development: `exp://localhost:19000/*`
   - Production: `https://yourdomain.com/*`
4. Click **Save**

**Verification**:
- All providers show "Enabled" status (green)
- No error messages
- JWT settings display correctly

---

### Method 2: Verification Script

**File**: `verify_auth_configuration.py`

**Purpose**: Automated verification of auth configuration

**Prerequisites**:
```bash
pip install supabase requests python-dotenv
```

**Execution**:
```bash
cd AporTamos-Backend/database
python verify_auth_configuration.py
```

**Expected Output**:
```
Connecting to Supabase...
✓ Connected to Supabase

============================================================
AUTHENTICATION PROVIDERS
============================================================
✓ Email/password authentication ENABLED
✓ Google OAuth ENABLED
  Client ID: xxxxxxxxxx.apps.googleusercontent...

============================================================
JWT TOKEN SETTINGS
============================================================
✓ JWT expiration configured: 3600s (1h)
✓ JWT secret configured

============================================================
AUTH CONFIGURATION VERIFICATION COMPLETE
============================================================
```

---

## Implementation Steps

### Step 1: Configure Email/Password Provider

**Dashboard Steps**:
1. Supabase Dashboard → Authentication → Providers
2. Click **Email** 
3. Verify these settings:
   - [x] Confirm email enabled
   - [x] Allow both signed up and invited
   - [x] Double confirm changes enabled
   - [x] Email change enabled
4. Click **Save**

**Expected Result**: Email provider shows "Enabled" status

### Step 2: Configure Google OAuth (Optional)

**Prerequisites**:
- Google Cloud project created
- OAuth 2.0 credentials generated
- Redirect URI: `https://<project>.supabase.co/auth/v1/callback`

**Dashboard Steps**:
1. Supabase Dashboard → Authentication → Providers
2. Click **Google**
3. Enter credentials:
   - Client ID: `xxxxxxxx.apps.googleusercontent.com`
   - Client Secret: (from Google Console)
4. Click **Save**

**Expected Result**: Google provider shows "Enabled" status

### Step 3: Configure JWT Settings

**Dashboard Steps**:
1. Supabase Dashboard → Authentication → JWT Settings
2. Verify or set:
   - Token Expiration: 3600 seconds (1 hour)
   - Refresh Token Expiration: 604800 (7 days)
3. Leave Secret and Algorithm at defaults
4. Click **Save**

**Expected Result**: Settings saved without errors

### Step 4: Configure Redirect URLs

**Dashboard Steps**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: Set to your app domain
3. Redirect URLs: Add these entries:
   ```
   http://localhost:3000/*
   http://localhost:8081/*
   exp://localhost:19000/*
   https://yourdomain.com/*
   https://yourdomain.com/auth/callback
   ```
4. Click **Save**

**Expected Result**: All URLs saved without validation errors

### Step 5: Setup Email Templates

**Dashboard Steps**:
1. Supabase Dashboard → Authentication → Email Templates
2. For each template (Confirmation, Password Reset, Invite):
   - Click template name
   - Review default content
   - Customize if desired
   - Click **Save**

**Expected Result**: All templates display correctly

---

## Testing Authentication

### Email/Password Test

**Register**:
1. Go to app registration screen
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!`
4. Click Register
5. Verify confirmation email sent (check spam folder)
6. Click email confirmation link
7. Account created successfully ✓

**Login**:
1. Go to app login screen
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!`
4. Click Login
5. Verify JWT token issued
6. App shows home dashboard ✓

**Logout**:
1. From dashboard, click Logout
2. Verify redirected to login screen
3. Session cleared from secure storage ✓

### Google OAuth Test

**Login with Google**:
1. Go to app login screen
2. Click "Sign in with Google" button
3. Redirected to Google login page
4. Authenticate with Google account
5. Redirected back to app
6. App shows home dashboard
7. Verify user created in Supabase ✓

**Verification**:
1. Open Supabase Dashboard → Authentication → Users
2. Verify new user appears with Google identity
3. Check user has email and metadata
4. Verify JWT token in app storage

---

## Integration with Application

### Frontend Integration

**File**: `AporTamos-Frontend/services/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**File**: `AporTamos-Frontend/hooks/useAuth.ts`

```typescript
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**File**: `AporTamos-Frontend/context/AuthContext.tsx`

```typescript
import { createContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

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

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Backend Integration

**File**: `AporTamos-Backend/app/dependencies.py`

```python
from supabase import create_client
import os

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase_client = create_client(supabase_url, supabase_key)

def get_supabase():
    return supabase_client
```

**JWT Verification**:
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Verify token with Supabase
        user = supabase_client.auth.get_user(token)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## Security Considerations

### Password Requirements

**Configure in Dashboard**:
1. Authentication → Security
2. Set minimum length: 6 characters (recommended: 12+)
3. Enable special characters: Recommended

### Email Verification

- Always require email confirmation before account active
- Reduces spam and invalid accounts
- Prevents account takeover via unverified emails

### Token Security

- JWT tokens stored in secure storage (Keychain/Keystore)
- Never store in localStorage on web (use HttpOnly cookies if possible)
- Token expiration set to 1 hour (refresh token rotates)
- Refresh token stored separately for automatic renewal

### Rate Limiting

- Supabase automatically rate limits login attempts
- Prevents brute force attacks
- Adjustable via dashboard if needed

### HTTPS Required

- All auth flows require HTTPS in production
- Development can use HTTP for localhost
- Certificates required for production domains

---

## Troubleshooting

### Issue: "Email provider disabled"

**Solution**:
1. Dashboard → Authentication → Providers
2. Click Email provider
3. Toggle Enable ON
4. Click Save
5. Refresh page to verify

### Issue: "Google OAuth not working"

**Common Causes**:
1. Client ID/Secret incorrect
2. Redirect URI misconfigured
3. Google Console project not authorized

**Solutions**:
1. Verify Client ID in Google Cloud Console
2. Copy exact Client Secret (no extra spaces)
3. Add redirect URI to Google Console authorized list
4. Wait 1-2 minutes for changes to propagate
5. Test again

### Issue: "Email confirmation not received"

**Causes**:
- SMTP not configured
- Email template has errors
- Email marked as spam
- Invalid email address

**Solutions**:
1. Check email spam folder
2. Use test email (Gmail, Outlook)
3. Configure SMTP in dashboard if using custom domain
4. Check email template for broken links
5. Try with different email address

### Issue: "JWT token invalid or expired"

**Causes**:
- Token expired (>1 hour old)
- Token signature verification failed
- Wrong secret key used

**Solutions**:
1. Refresh token before making API calls
2. Verify backend is using correct public key
3. Check token expiration time in dashboard
4. Ensure SUPABASE_URL and keys match

---

## Task Completion

### Verification Steps

1. **Email/Password**:
   - [ ] Provider enabled in dashboard
   - [ ] Can register with email
   - [ ] Can login with credentials
   - [ ] JWT token issued

2. **Google OAuth**:
   - [ ] Provider enabled in dashboard
   - [ ] Can sign in with Google
   - [ ] User created in Supabase
   - [ ] JWT token issued

3. **JWT Settings**:
   - [ ] Token expiration configured (3600s)
   - [ ] Refresh token rotation working
   - [ ] Backend can verify tokens

4. **Redirect URLs**:
   - [ ] Development URLs configured
   - [ ] Production URLs configured
   - [ ] OAuth callbacks working

5. **Frontend Integration**:
   - [ ] Supabase client initialized
   - [ ] Auth context created
   - [ ] Login/Register screens working
   - [ ] Logout clears session

6. **Backend Integration**:
   - [ ] Supabase client initialized
   - [ ] JWT middleware working
   - [ ] Protected endpoints reject invalid tokens

### Sign-Off

- [ ] All configuration steps complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Ready to proceed to T013

---

## Files Provided

| File | Purpose |
|------|---------|
| `verify_auth_configuration.py` | Automated verification script |
| `AUTH_CONFIGURATION_VERIFICATION.sql` | SQL verification queries |
| `T012_AUTH_CONFIGURATION_CHECKLIST.md` | Comprehensive checklist |
| `README_T012.md` | This implementation guide |

---

## Summary

Task T012 configures Supabase Auth with:

✓ **Email/Password** - Standard registration and login  
✓ **Google OAuth** - Social login capability  
✓ **JWT Tokens** - Session management (1-hour expiration)  
✓ **Email Templates** - Confirmation and reset  
✓ **Redirect URLs** - Development and production

**Configuration Time**: 10-15 minutes  
**Testing Time**: 5-10 minutes  
**Total Effort**: ⭐⭐ Minimal (mostly dashboard clicks)

**Next Task**: T013 - Supabase Real-time Configuration

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://cloud.google.com/docs/authentication/oauth-2.0)
- [API Endpoints Spec](../specs/001-household-tasks/contracts/api-endpoints.md)
- [Authentication Research](../specs/001-household-tasks/research.md#5-authentication-email-password-vs-google-oauth)
- [Verification SQL](AUTH_CONFIGURATION_VERIFICATION.sql)
- [Verification Script](verify_auth_configuration.py)

---

## Quick Reference

### Email/Password Registration
```
POST /auth/register
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "User Name"
}
```

### Email/Password Login
```
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

### Google OAuth
```
POST /auth/google-login
{
  "google_token": "eyJhbGci..."
}
```

### Logout
```
POST /auth/logout
(No body required)
```

All endpoints except `/auth/*` require:
```
Authorization: Bearer <JWT_TOKEN>
```
