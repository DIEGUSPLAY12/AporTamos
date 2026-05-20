# Plan: US6 — Real-Time Chat

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Contratos**: [../contracts/realtime-events.md](../contracts/realtime-events.md)

---

## Flujo principal

```
Enviar mensaje de texto:
  POST /households/{id}/chat/message
    → { message_type: "text", content: "texto" }
    → Crea ChatMessage en DB
    → Supabase real-time emite INSERT a todos los subscriptores del channel
    → Mensaje aparece en todos los clientes <2s

Enviar audio/imagen:
  POST /households/{id}/chat/message  (multipart/form-data)
    → { message_type: "audio"|"image", file: binary }
    → Backend sube a Supabase Storage: chat-media/{household_id}/messages/{id}.{ext}
    → Crea ChatMessage con media_url
    → Real-time notifica a subscriptores

Ver historial:
  GET /households/{id}/chat/messages?limit=50&before={cursor}
    → Paginación por cursor (created_at)
    → Más recientes primero
```

## Real-time con Supabase

```typescript
// En services/realtime.ts o useChat.ts
supabase
  .channel(`chat:${channelId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `channel_id=eq.${channelId}`
  }, (payload) => {
    // Añadir mensaje a la lista en tiempo real
    addMessage(payload.new)
  })
  .subscribe()
```

## Validaciones

- `message_type=text` → `content` requerido, `media_url` null
- `message_type=audio|image` → `media_url` requerido (tras upload), `content` null
- Tamaño máximo media: 10MB (o el límite del Supabase Storage)

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/models/chat.py` | ChatChannelResponse, ChatMessageCreate, ChatMessageResponse, MessageTypeEnum |
| `app/services/chat_service.py` | send_message(), get_messages(), upload_media(), get_channel_by_household() |
| `app/routers/chat.py` | GET /households/{id}/chat/messages, POST /households/{id}/chat/message |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `services/realtime.ts` | Suscripción a chat_messages via Supabase channel |
| `services/audio.ts` | Grabar audio (expo-av), comprimir, preparar para upload |
| `components/chat/ChatMessage.tsx` | Burbuja de mensaje: texto / imagen / audio player |
| `components/chat/MessageInput.tsx` | Input texto + botones: attach, audio record, send |
| `components/chat/ChatList.tsx` | FlatList con auto-scroll al último mensaje |
| `hooks/useChat.ts` | Fetch historial + subscribe real-time + offline queue |
| `app/(tabs)/chat/index.tsx` | Lista de chats (uno por household) |
| `app/(tabs)/chat/[householdId].tsx` | Chat detail: ChatList + MessageInput |

## Dependencias de librerías

| Librería | Uso |
|----------|-----|
| `expo-av` | Grabación y reproducción de audio |
| `expo-image-picker` | Seleccionar imágenes (ya usado en US4) |

## Nota: Chat channel auto-creado

El ChatChannel ya se crea en `household_service.create_household()` (T037, US2). Esta US solo implementa la UI y los endpoints de mensajería.

## Offline queue para mensajes

Si el envío falla por red:
- Mensaje se guarda en `offlineQueue.ts` (compartido con US4)
- Se reintenta al reconectar
- La UI muestra el mensaje con estado "sending..." o "failed"
