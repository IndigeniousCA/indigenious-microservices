# Chat System Feature

## Overview
Built-in encrypted chat system enabling secure communication between government departments, Indigenous businesses, and band councils.

## 🎯 Purpose
- Enable real-time communication for RFQ clarifications
- Build trust through direct engagement
- Maintain audit trail of all procurement communications
- End-to-end encryption for sensitive discussions

## 📁 Structure
```
chat/
├── components/
│   ├── ChatSystem.tsx         # Main chat container
│   ├── ChannelList.tsx        # List of conversations
│   ├── MessageList.tsx        # Message display area
│   ├── MessageBubble.tsx      # Individual message component
│   ├── MessageInput.tsx       # Input area with attachments
│   └── TypingIndicator.tsx    # Show when others are typing
├── hooks/
│   ├── useChat.ts            # Chat state management
│   ├── useEncryption.ts      # Message encryption/decryption
│   └── useRealtime.ts        # Supabase realtime subscription
├── services/
│   ├── chat.service.ts       # Chat API calls
│   └── encryption.service.ts # Encryption utilities
├── types/
│   └── chat.types.ts         # TypeScript interfaces
└── tests/
    └── chat.test.tsx         # Component tests
```

## 🔧 Usage

### Basic Implementation
```tsx
import { ChatSystem } from '@/features/chat'

export default function ChatPage() {
  return (
    <ChatSystem 
      userId={currentUser.id}
      defaultChannel={channelId} // Optional: open specific chat
    />
  )
}
```

### Embedded in RFQ
```tsx
import { ChatWidget } from '@/features/chat/components/ChatWidget'

export function RFQDetailPage({ rfq }) {
  return (
    <>
      <RFQDetails rfq={rfq} />
      <ChatWidget 
        channelId={rfq.chatChannelId}
        participants={[rfq.createdBy, currentUser.id]}
        metadata={{ rfqId: rfq.id }}
      />
    </>
  )
}
```

## 💬 Channel Types

### 1. Direct Messages
- One-on-one conversations
- Between any verified users
- Encrypted by default

### 2. RFQ Channels
- Linked to specific RFQ
- All bidders can ask questions
- Answers visible to all participants

### 3. Project Channels
- For ongoing project communication
- Limited to awarded contractor + buyer
- Document sharing enabled

### 4. Support Channels
- Platform support
- Technical assistance
- Dispute resolution

## 🔐 Encryption

### Message Encryption Flow
```typescript
1. User types message
2. Generate channel-specific key
3. Encrypt message content
4. Send encrypted content to Supabase
5. Recipients decrypt with same key
```

### Key Management
- Keys derived from channel ID + salt
- Stored in secure browser storage
- Rotated periodically

## 📎 File Attachments

### Supported File Types
- Documents: PDF, DOC, DOCX
- Images: JPG, PNG, GIF
- Blueprints: DWG, DXF
- Spreadsheets: XLS, XLSX
- Max size: 50MB per file

### Upload Flow
```typescript
const handleFileSelect = async (files: File[]) => {
  // 1. Upload to storage
  const urls = await uploadFiles(files)
  
  // 2. Create attachment metadata
  const attachments = files.map((file, i) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    url: urls[i]
  }))
  
  // 3. Send message with attachments
  await sendMessage(content, attachments)
}
```

## 🔔 Real-time Features

### Presence
- Online/offline status
- "User is typing..." indicator
- Last seen timestamp

### Notifications
- Desktop notifications for new messages
- Email notifications for offline users
- In-app notification badge

### Read Receipts
- Single check: Sent
- Double check: Delivered
- Blue double check: Read

## 📡 API Integration

### Send Message
```typescript
POST /api/chat/messages
{
  channelId: string
  content: string (encrypted)
  attachments?: Attachment[]
  replyTo?: string
}
```

### Get Messages
```typescript
GET /api/chat/channels/:channelId/messages?limit=50&before=messageId
```

### Mark as Read
```typescript
POST /api/chat/messages/read
{
  messageIds: string[]
}
```

## 🎨 UI Components

### Message States
- Sending (opacity 0.7)
- Sent (full opacity)
- Failed (red indicator + retry)

### Message Actions
- Reply
- Edit (own messages, 15 min window)
- Delete (own messages)
- Copy text
- Download attachments

## 🧪 Testing

Run tests:
```bash
npm test chat
```

Key test scenarios:
- Message sending/receiving
- Encryption/decryption
- File upload
- Real-time updates
- Error handling

## 🚀 Future Enhancements

1. **Voice/Video Calls** - WebRTC integration
2. **Message Translation** - Auto-translate Indigenous languages
3. **Smart Replies** - AI-suggested responses
4. **Message Search** - Full-text encrypted search
5. **Scheduled Messages** - Send at specific time

## 💡 Best Practices

1. Always encrypt sensitive information
2. Implement message rate limiting
3. Clear notifications after reading
4. Compress images before upload
5. Archive old conversations

## 🐛 Known Issues

- Typing indicator sometimes persists
- Large file uploads can timeout
- Emoji reactions not yet implemented

## 📚 Related Documentation

- [RFQ System](../rfq-system/README.md)
- [Encryption Standards](../../docs/security/encryption.md)
- [Real-time Architecture](../../docs/architecture/realtime.md)