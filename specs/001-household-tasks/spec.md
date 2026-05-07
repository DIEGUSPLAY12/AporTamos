# Feature Specification: AporTamos - Household Task Management Platform

**Feature Branch**: `001-household-tasks`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: Complete application specification document for household chore management system

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registration and Authentication (Priority: P1)

Users need to create accounts and log into the AporTamos platform using standard credentials or Google OAuth to access their household management dashboard.

**Why this priority**: Authentication is the critical foundation for all other features. Without this, no user can access the system.

**Independent Test**: Can be fully tested by attempting to register via email/password, register via Google, log in with valid credentials, and attempting log in with invalid credentials.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** I enter valid credentials, **Then** I am authenticated and directed to the home dashboard
2. **Given** I am on the login page, **When** I click "Login with Google", **Then** I am redirected to Google OAuth flow and authenticated
3. **Given** I am on the registration page, **When** I enter a new email and password, **Then** my account is created and I can log in
4. **Given** I am on the login page, **When** I enter invalid credentials, **Then** I see an error message and remain on the login page
5. **Given** I am logged in, **When** I click logout, **Then** I am logged out and redirected to the login page

---

### User Story 2 - Create and Join Households (Priority: P1)

Users must be able to create new households and join existing ones via invitations, establishing the core unit of organization for task management.

**Why this priority**: Households are the central organizational unit. Users cannot manage tasks without first being part of a household.

**Independent Test**: Can be fully tested by creating a new household, inviting other users, having them join, and verifying household membership.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** I click "Create Household", **Then** I am taken to a form to name the household
2. **Given** I am creating a household, **When** I enter a name and submit, **Then** the household is created and I am the owner
3. **Given** I am on my household page, **When** I invite another user by email, **Then** they receive an invitation and can join
4. **Given** I have received a household invitation, **When** I accept it, **Then** I am added to the household
5. **Given** I am on the home page, **When** I see a list of my households, **Then** all joined households are displayed with their daily streak count

---

### User Story 3 - View and Configure Weekly Task Schedule (Priority: P1)

Household managers must be able to create, modify, and assign weekly task schedules to define what chores need to be completed each day.

**Why this priority**: The task schedule is fundamental to the entire system's purpose. Without tasks defined, there's nothing to track or gamify.

**Independent Test**: Can be fully tested by creating a household, defining a weekly schedule with multiple tasks, and verifying tasks appear in user task lists.

**Acceptance Scenarios**:

1. **Given** I am on the household management page, **When** I click "Create Weekly Schedule", **Then** I see a form to define tasks for each day of the week
2. **Given** I am creating a schedule, **When** I add a task (e.g., "Wash dishes") with effort weight, **Then** the task is saved with its point value
3. **Given** I have a task in the schedule, **When** I assign it to a specific user, **Then** it appears in their task list for that day
4. **Given** I have a task in the schedule, **When** I mark it as "Random Assignment" with daily frequency, **Then** the system assigns it randomly to a user each day
5. **Given** I am on the household page, **When** I modify an existing schedule, **Then** changes are reflected in user task lists

---

### User Story 4 - View Personal Tasks and Complete Them with Photo Proof (Priority: P1)

Users must see their assigned tasks and mark them complete by submitting a photo as proof of completion, driving engagement through tangible verification.

**Why this priority**: Task completion is the core interaction loop of the app. Without this, the gamification system cannot function.

**Independent Test**: Can be fully tested by viewing assigned tasks, attempting to mark a task complete with a photo, and verifying task appears in completed list.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** I click on a household, **Then** I see "My Tasks" section showing my pending tasks for today
2. **Given** I have pending tasks, **When** I click a task, **Then** I can see the task details and a button to mark as complete
3. **Given** I am marking a task complete, **When** I upload a photo as proof, **Then** the task is marked complete and the photo is stored
4. **Given** I have completed tasks, **When** I view the task list, **Then** completed tasks are shown separately from pending tasks
5. **Given** the household reaches 100% task completion, **When** I view the household page, **Then** the daily streak increments by 1

---

### User Story 5 - View Household Statistics and Personal Progress (Priority: P2)

Users need to see their daily task completion percentage, current streak, and household overview to track collective progress and stay motivated.

**Why this priority**: Statistics and progress visualization are critical for gamification engagement. This directly drives user motivation without blocking core functionality.

**Independent Test**: Can be fully tested by completing tasks and verifying correct calculations appear on home page and household page.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** I view my statistics widget, **Then** I see my daily task completion percentage
2. **Given** I am on the home page, **When** I view my statistics widget, **Then** I see my current streak count
3. **Given** I am on a household page, **When** I view the household header, **Then** I see the household's current daily streak
4. **Given** the household completes all tasks, **When** I view the stats next day, **Then** the streak increments and resets to 0% completion
5. **Given** I am on the household page, **When** I view the members section, **Then** I see all household members listed

---

### User Story 6 - Real-Time Chat Communication (Priority: P2)

Household members need to communicate via chat to coordinate tasks, discuss household matters, and share updates in real-time.

**Why this priority**: Chat enables household coordination but doesn't block core task management. It enhances collaboration without being strictly necessary for task completion.

**Independent Test**: Can be fully tested by creating a household, accessing the chat, sending messages, and verifying receipt by other members.

**Acceptance Scenarios**:

1. **Given** I create a household, **When** I view my chats, **Then** an automatic chat channel for this household is created
2. **Given** I am in a chat, **When** I type a message and hit send, **Then** the message appears instantly for all household members
3. **Given** I am in a chat, **When** I click the attachment button, **Then** I can select audio or media files to send
4. **Given** I am in a chat, **When** I record and send audio, **Then** other members can play the audio file
5. **Given** I am on the home page, **When** I navigate to "My Chats", **Then** I see all household chats I belong to

---

### Edge Cases

- What happens when a user completes a task but the photo upload fails? (Task should remain pending until photo is successfully uploaded)
- How does the system handle task completion if a user is offline? (Photo upload should queue and retry when connection is restored)
- What happens when a household has 0 assigned tasks for a day? (Household cannot reach 100% and streak does not increment that day)
- How does random task assignment work if all tasks are explicitly assigned? (Random assignment tasks coexist with explicit assignments)
- What happens if a household owner deletes their account? (Household ownership should transfer to the next longest-standing member or require explicit reassignment)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support user registration with email/password and Google OAuth authentication
- **FR-002**: System MUST allow users to create households and become the initial owner
- **FR-003**: System MUST allow household owners to invite users via email and manage household membership
- **FR-004**: System MUST support explicit task assignment (assign specific task to specific user) within weekly schedules
- **FR-005**: System MUST support random daily task assignment (distribute task randomly to any household member each day)
- **FR-006**: System MUST display user's daily task list with pending and completed tasks
- **FR-007**: System MUST allow users to mark tasks complete by uploading a photo as proof
- **FR-008**: System MUST calculate household completion percentage based on assigned tasks and completions each day
- **FR-009**: System MUST track and display daily streak (increments when household reaches 100% completion, resets to 0% next day)
- **FR-010**: System MUST display user statistics: daily completion percentage and current streak
- **FR-011**: System MUST support weighted task scoring where each task has an assigned effort value (points)
- **FR-012**: System MUST calculate household progress percentage based on weighted task scores, not task count
- **FR-013**: System MUST create an automatic chat channel for each household when created
- **FR-014**: System MUST support real-time messaging within chat channels
- **FR-015**: System MUST support text, audio, and multimedia content in chat messages
- **FR-016**: System MUST display household members list on the household management page
- **FR-017**: System MUST create and persist weekly task schedules with tasks assigned to specific days
- **FR-018**: System MUST allow modification of task schedules after creation
- **FR-019**: System MUST validate that task completion requires a photo submission
- **FR-020**: System MUST handle and store photo evidence of task completion

### Key Entities

- **User**: Represents an individual account holder with authentication credentials (email or Google OAuth), profile information, and household memberships
- **Household**: Represents a shared living space that contains members, tasks, chat channels, and gamification metrics (streak, daily completion %)
- **Weekly Task Schedule**: Defines all tasks for a household across days of the week, including assignment type (explicit vs random) and effort weights
- **Task**: Individual chore or responsibility with name, effort weight (points), assignment method, and recurrence (daily, weekly)
- **Task Assignment**: Links a task to a specific user or marks it for random assignment within a household for a specific date
- **Task Completion**: Records when a user marks a task complete, includes timestamp, proof (photo), and user reference
- **Chat Channel**: Automatic communication space created per household, contains all real-time messages for that household
- **Chat Message**: Individual message in a channel, supports text, audio, and multimedia content with timestamp and sender reference

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration and first login within 2 minutes
- **SC-002**: Household owners can define a complete weekly schedule within 10 minutes
- **SC-003**: Users can view assigned tasks and mark one complete with photo within 1 minute
- **SC-004**: Chat messages are delivered and visible to all household members in under 2 seconds
- **SC-005**: System displays accurate household completion percentage that updates within 5 seconds of task completion
- **SC-006**: At least 80% of users successfully complete their first household task without support
- **SC-007**: Household members report improved coordination and task clarity compared to pre-app state (qualitative measure)
- **SC-008**: System supports at least 100 households with 500+ concurrent active users without performance degradation
- **SC-009**: Task completion rate increases by at least 30% compared to households without the app
- **SC-010**: Users return to the app at least 4 times per week (engagement metric)

## Assumptions

- **User Base**: Users have smartphones with camera capability and stable internet connectivity to upload photos and use chat features
- **Household Composition**: Households typically contain 2-6 members living in the same residence
- **Task Complexity**: Tasks are simple household chores completable in under 1 hour (dishwashing, vacuuming, laundry, etc.)
- **Schedule Stability**: Weekly schedules are relatively stable and reusable week-to-week; modifications are infrequent
- **Device Support**: Mobile-first (iOS/Android via React Native/Expo) is the primary platform; web access is secondary/supporting
- **Real-Time Infrastructure**: Supabase real-time subscriptions will handle synchronization across devices and users
- **Authentication**: Google OAuth integration will use standard Supabase auth mechanisms
- **Photo Storage**: Proof photos will be stored in Supabase storage with a maximum size limit of 5MB per image
- **Chat Persistence**: Chat history persists indefinitely; no automatic cleanup of old messages
- **Gamification**: Daily streaks are reset daily at midnight in the household's local timezone
- **Random Assignment**: Random task distribution uses fair randomization to balance workload across users over time
