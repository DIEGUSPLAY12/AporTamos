# Tasks: US6 — Real-Time Chat Communication (P2)

**Status**: ⬜ PENDIENTE  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Requiere**: 00-setup completado. Independiente de US4/US5.

---

## Backend

- [X] T093 [P] Create ChatChannel and ChatMessage Pydantic models in AporTamos-Backend/app/models/chat.py
- [X] T094 [P] Create chat service in AporTamos-Backend/app/services/chat_service.py (send message, fetch history, media handling)
- [ ] T095 Implement GET /households/{id}/chat/messages endpoint in AporTamos-Backend/app/routers/chat.py (fetch chat history with pagination)
- [ ] T096 [P] Implement POST /households/{id}/chat/message endpoint (send text message)
- [ ] T097 [P] Implement POST /households/{id}/chat/message with multipart upload for audio/image (same endpoint, different message_type)
- [ ] T098 [P] Add message validation: exactly one of (content or media_url) must be set
- [ ] T098b [P] Upload chat media to Supabase Storage bucket chat-media: /{household_id}/messages/{message_id}.{ext}

## Frontend

- [ ] T099 [P] Create real-time subscription in AporTamos-Frontend/services/realtime.ts for chat_messages table
- [ ] T100 [P] Create ChatMessage component in AporTamos-Frontend/components/chat/ChatMessage.tsx (text / image / audio player)
- [ ] T101 [P] Create MessageInput component in AporTamos-Frontend/components/chat/MessageInput.tsx (text input + attach + audio record + send)
- [ ] T102 Create audio recording feature in AporTamos-Frontend/services/audio.ts (record, compress, upload via expo-av)
- [ ] T103 [P] Create ChatList component in AporTamos-Frontend/components/chat/ChatList.tsx (auto-scroll to latest)
- [ ] T104 [P] Create useChat hook in AporTamos-Frontend/hooks/useChat.ts (fetch messages + real-time + offline queue)
- [ ] T105 Create Chat screen in AporTamos-Frontend/app/(tabs)/chat/index.tsx (list of household chats)
- [ ] T106 Create ChatDetail screen in AporTamos-Frontend/app/(tabs)/chat/[householdId].tsx (full chat UI)
- [ ] T107 [P] Implement offline message queueing in AporTamos-Frontend/services/offlineQueue.ts (retry on reconnection)
- [ ] T108 [P] Handle real-time socket disconnection and reconnection gracefully
- [ ] T109 Add chat notification badge on tab showing unread count (optional enhancement)

**Checkpoint**: ⬜ US6 pendiente — real-time household communication enabled

---

## Acceptance Scenarios Verification

- [ ] Chat channel auto-created for household (ya existe via T037)
- [ ] Messages appear in <2 seconds (SC-004)
- [ ] Can send audio/media files
- [ ] Other members receive messages instantly
- [ ] Chat history persists
