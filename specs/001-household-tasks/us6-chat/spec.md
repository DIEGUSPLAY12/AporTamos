# Spec: US6 — Real-Time Chat Communication (P2)

**Prioridad**: P2 — Post-MVP  
**Status**: ⬜ Pendiente  
**Requiere**: [00-setup](../00-setup/) completado (Supabase real-time + chat_media bucket). Independiente de US4 y US5.

---

## User Story

Household members need to communicate via chat to coordinate tasks, discuss household matters, and share updates in real-time.

**Why this priority**: Chat enables household coordination but doesn't block core task management. It enhances collaboration without being strictly necessary for task completion.

**Independent Test**: Can be fully tested by creating a household, accessing the chat, sending messages, and verifying receipt by other members.

---

## Acceptance Scenarios

1. **Given** I create a household, **When** I view my chats, **Then** an automatic chat channel for this household is created
2. **Given** I am in a chat, **When** I type a message and hit send, **Then** the message appears instantly for all household members
3. **Given** I am in a chat, **When** I click the attachment button, **Then** I can select audio or media files to send
4. **Given** I am in a chat, **When** I record and send audio, **Then** other members can play the audio file
5. **Given** I am on the home page, **When** I navigate to "My Chats", **Then** I see all household chats I belong to

---

## Functional Requirements

- **FR-013**: System MUST create an automatic chat channel for each household when created
- **FR-014**: System MUST support real-time messaging within chat channels
- **FR-015**: System MUST support text, audio, and multimedia content in chat messages

---

## Key Entities

**ChatChannel** (creado automáticamente al crear household en US2/T037)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| household_id | UUID | FK → households, UNIQUE |
| created_at | timestamp | — |

**ChatMessage**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| channel_id | UUID | FK → chat_channels |
| sender_id | UUID | FK → users |
| message_type | enum | `text` \| `audio` \| `image` |
| content | text, nullable | Para mensajes de texto |
| media_url | string, nullable | Para audio/imagen |
| created_at | timestamp | — |

---

## Constraints

- Exactamente uno de `content` o `media_url` debe estar presente (no ambos, no ninguno)
- Chat media storage: `chat-media/{household_id}/messages/{message_id}.{ext}` (bucket privado)
- Chat history persiste indefinidamente (sin cleanup automático)

---

## Success Criteria

- **SC-004**: Chat messages delivered and visible to all household members in under 2 seconds
