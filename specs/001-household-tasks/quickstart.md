# Quickstart: AporTamos Development

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This guide provides step-by-step instructions for setting up the AporTamos development environment locally.

## Prerequisites

- **Node.js**: v18+ (for frontend/Expo)
- **Python**: 3.10+ (for backend)
- **Git**: For version control
- **Supabase account**: Free tier at https://supabase.com
- **Google OAuth credentials**: For testing Google login (optional for initial dev)
- **iOS Simulator** (macOS) or **Android Emulator** (all platforms)
- **Expo CLI**: Will install via npm

## Project Structure

```
AporTamos/
├── AporTamos-Backend/       # FastAPI Python server
├── AporTamos-Frontend/      # React Native Expo app
├── .github/                 # GitHub config and instructions
└── .specify/                # Spec Kit configuration
```

---

## Part 1: Backend Setup (FastAPI)

### 1.1 Environment Setup

```bash
# Navigate to backend directory
cd AporTamos-Backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

### 1.2 Install Dependencies

```bash
# Install requirements
pip install -r requirements.txt
```

**requirements.txt** should include:
```
fastapi==0.109.0
uvicorn==0.27.0
python-dotenv==1.0.0
supabase==2.0.0
pydantic==2.5.0
python-jose==3.3.0
passlib==1.7.4
python-multipart==0.0.6
httpx==0.25.2
sqlalchemy==2.0.23
alembic==1.13.0
```

### 1.3 Supabase Configuration

Create `.env` file in `AporTamos-Backend/`:

```env
# Supabase Connection
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
SECRET_KEY=your-secret-key-for-jwt-signing
ALGORITHM=HS256

# Environment
ENVIRONMENT=development
```

**Getting Supabase credentials:**
1. Create project at https://supabase.com
2. Go to Project Settings → API
3. Copy URL and keys
4. Enable Auth providers: Email, Google (optional)

### 1.4 Database Schema Setup

```bash
# Apply migrations to Supabase
# (Migrations created during implementation phase)
python -m alembic upgrade head

# Or manually create tables via Supabase SQL Editor:
# See data-model.md for full schema
```

### 1.5 Run Backend Server

```bash
# Start development server
uvicorn app.main:app --reload

# Server runs on: http://localhost:8000
# API docs: http://localhost:8000/docs (Swagger UI)
```

**Verify backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "ok"}
```

---

## Part 2: Frontend Setup (React Native + Expo)

### 2.1 Environment Setup

```bash
# Navigate to frontend directory
cd AporTamos-Frontend

# Install Node dependencies
npm install
# or
yarn install
```

### 2.2 Create Environment File

Create `.env.local` in `AporTamos-Frontend/`:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth (optional)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Environment
EXPO_PUBLIC_ENVIRONMENT=development
```

**Note**: Environment variables in Expo must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

### 2.3 Install Expo CLI

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Or use npx (comes with npm):
npx expo --version
```

### 2.4 Run Frontend in Development

```bash
# Start Expo development server
npm start
# or
yarn start
```

**Output will show:**
```
Metro Bundler ready at 127.0.0.1:8081
Expo Go app available at exp://...
QR code for mobile scanning
```

### 2.5 Run on Simulator/Emulator

**iOS Simulator (macOS):**
```bash
# From the Expo menu, press `i`
# Or:
npm run ios
```

**Android Emulator:**
```bash
# Make sure Android emulator is running first
# From the Expo menu, press `a`
# Or:
npm run android
```

**Physical Device:**
1. Install "Expo Go" app from App Store/Play Store
2. Scan QR code from terminal output
3. App opens in Expo Go

### 2.6 Verify Frontend is Running

The app should show:
- Login screen with Email and Google login options
- Once logged in: Home dashboard with households list
- Navigation tabs: Home, Explore, Chat, Profile

---

## Part 3: Supabase Real-Time Configuration

### 3.1 Enable Real-Time Subscriptions

In Supabase dashboard:

1. Go to **Database** → **Publications**
2. Create publication `realtime_publication` on tables:
   - `chat_messages`
   - `task_assignments`
   - `task_completions`

```sql
-- SQL (run in Supabase SQL Editor):
CREATE PUBLICATION realtime_publication FOR TABLE 
  public.chat_messages, 
  public.task_assignments, 
  public.task_completions;
```

### 3.2 Enable Row-Level Security (RLS)

For each table that needs data privacy:

```sql
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Users can only see their households
CREATE POLICY "Users can view their households"
ON public.households
FOR SELECT
USING (
  id IN (
    SELECT household_id FROM public.household_members 
    WHERE user_id = auth.uid()
  )
);
```

---

## Part 4: Testing API Endpoints

### 4.1 Using Swagger UI

1. Navigate to: http://localhost:8000/docs
2. Click "Authorize" button (top right)
3. Enter a JWT token for authenticated endpoints
4. Try endpoints interactively

### 4.2 Using curl/Postman

**Register a user:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword"
  }'

# Response:
# {"access_token": "eyJh...", "token_type": "bearer"}
```

**Create a household (authenticated):**
```bash
curl -X POST http://localhost:8000/households \
  -H "Authorization: Bearer eyJh..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Apartment",
    "timezone_id": "America/New_York"
  }'
```

---

## Part 5: Manual Testing Procedures

Since AporTamos Constitution prohibits automated testing, manual verification is the primary quality gate.

### 5.1 Authentication Testing

**Test Case 1: Email Registration**
1. Open app
2. Tap "Sign Up" on login screen
3. Enter: email, password, name
4. Tap "Create Account"
5. **Verify**: User is logged in and sees home dashboard

**Test Case 2: Google Login**
1. Open app
2. Tap "Login with Google"
3. Authenticate with Google account
4. **Verify**: User is logged in and sees home dashboard

**Test Case 3: Logout**
1. Logged in user
2. Navigate to Profile tab
3. Tap "Logout"
4. **Verify**: Redirected to login screen, can log back in

### 5.2 Household Management Testing

**Test Case 1: Create Household**
1. Home dashboard
2. Tap "Create Household"
3. Enter household name
4. Tap "Create"
5. **Verify**: New household appears in list with streak=0

**Test Case 2: Invite Member**
1. Open household
2. Tap "Manage" or settings
3. Enter member email and tap "Invite"
4. **Verify**: Invitation sent (check Firebase logs or email)
5. On second device/account: Accept invitation
6. **Verify**: User appears in household members list

### 5.3 Task Management Testing

**Test Case 1: Create Task Schedule**
1. In household, tap "Schedule"
2. Add task: "Wash dishes" (weight: 3, Monday, explicit→current user)
3. Tap "Save"
4. **Verify**: Task appears in "My Tasks" on Monday

**Test Case 2: Complete Task with Photo**
1. "My Tasks" tab
2. Find "Wash dishes" task
3. Tap task → "Mark Complete"
4. Tap camera icon → take photo
5. Tap "Submit"
6. **Verify**: 
   - Task marked as completed
   - Photo uploaded to Supabase Storage
   - Household completion % updates (1/1 = 100%)
   - Streak increments (if first task today)

### 5.4 Chat Testing

**Test Case 1: Send Message**
1. Chat tab → household chat
2. Type message: "Let's clean today!"
3. Tap "Send"
4. **Verify**: Message appears instantly in chat
5. On second device: Message appears in <2 seconds

**Test Case 2: Send Media**
1. Chat tab
2. Tap attachment icon
3. Select photo/video
4. Tap "Send"
5. **Verify**: Media uploaded and appears in chat for all members

### 5.5 Statistics Testing

**Test Case 1: Daily Completion %**
1. Home dashboard → "My Stats"
2. Should show "0% completed" if no tasks done today
3. Complete one task
4. **Verify**: Stat updates to show % completion

**Test Case 2: Household Streak**
1. Household page → header shows streak count
2. All household members complete all tasks
3. At midnight (or simulate with timezone change)
4. **Verify**: Streak increments by 1

---

## Part 6: Troubleshooting

### Issue: Expo won't connect to backend API

**Solution:**
```bash
# Check backend is running:
curl http://localhost:8000/health

# Check frontend .env.local has correct API_URL:
# Should be http://localhost:8000 (not 127.0.0.1 for Expo on device)

# If using physical device:
# Change EXPO_PUBLIC_API_URL to your machine's IP:
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000  # Replace with your IP
```

### Issue: Supabase connection fails

**Solution:**
```bash
# Verify credentials in backend .env:
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJh...  # Check this is correct from Supabase dashboard

# Test connection:
curl https://YOUR-PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR-ANON-KEY"
```

### Issue: Photo upload fails

**Solution:**
```bash
# Ensure Supabase Storage bucket exists
# In Supabase dashboard: Storage → Create new bucket "task-proofs"
# Set bucket to "Public"

# Check bucket policy allows uploads:
# See data-model.md for RLS policy SQL
```

### Issue: Real-time messages not updating

**Solution:**
```bash
# Ensure chat_messages table has RLS enabled and publication created
# In Supabase SQL Editor:
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE PUBLICATION realtime_pub FOR TABLE public.chat_messages;
```

---

## Part 7: Development Workflow

### Daily Development

1. **Backend changes:**
   ```bash
   cd AporTamos-Backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Frontend changes:**
   ```bash
   cd AporTamos-Frontend
   npm start
   # Select simulator/device from menu
   ```

3. **Manual testing:**
   - Follow test cases from Part 5
   - Test on physical device and simulator
   - Verify responsive design on different screen sizes

### Code Review

Per AporTamos Constitution:
1. **Focus on principle compliance:**
   - Is code readable and self-documenting? (Principle I)
   - Is UI simple and justified? (Principle II)
   - Does it work on mobile, tablet, desktop? (Principle III)
   - Are dependencies justified? (Principle IV)
   - No test code added? (Principle V)

2. **Manual verification over tests:**
   - Run app on actual devices
   - Test the user flows described in spec
   - Document any issues found

### Commits

```bash
# Good commit messages:
git commit -m "feat: add task completion with photo proof

- Users can now upload photo when marking task complete
- Photo stored in Supabase Storage bucket task-proofs
- Household completion percentage updates on submission
- Follows responsive design for mobile camera access"

# Avoid:
git commit -m "fix stuff"
git commit -m "add tests"  # No tests per Constitution!
```

---

## Resources

- **Spec**: [spec.md](spec.md) — Feature specification
- **Plan**: [plan.md](plan.md) — Implementation plan
- **Data Model**: [data-model.md](data-model.md) — Database schema
- **Research**: [research.md](research.md) — Technical decisions
- **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

## Next Steps

After setup:
1. Review the [data-model.md](data-model.md) to understand database entities
2. Review the [research.md](research.md) to understand key technical decisions
3. Follow test cases in Part 5 to verify everything works
4. Begin implementing tasks from `tasks.md` (generated via `/speckit.tasks`)

---

**Questions?** Refer to the specification documents or the constitution for guidance.

**Happy coding!** 🚀
