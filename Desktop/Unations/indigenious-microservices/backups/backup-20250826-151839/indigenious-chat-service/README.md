# Indigenous Chat Service

Real-time messaging service for the Indigenous Procurement Platform - enables secure communication between Indigenous businesses and procurement officers with RFQ discussion threads and file sharing.

## 💬 IMPORTANT SERVICE (60% Test Coverage)

This service provides real-time chat functionality with special features for Indigenous business communications including RFQ discussions, blueprint sharing, and multilingual support.

## Features

### Core Capabilities
- **Real-time Messaging**: Socket.IO-based instant messaging
- **Message Persistence**: PostgreSQL storage with encryption
- **File Sharing**: S3-backed file uploads with virus scanning
- **Conversation Management**: Direct, group, and RFQ discussions
- **Typing Indicators**: Real-time typing status
- **Read Receipts**: Message delivery and read tracking
- **Message Reactions**: Emoji reactions support
- **Search**: Full-text message search

### Indigenous-Specific Features
- RFQ discussion threads with procurement officers
- Blueprint and CAD file sharing for construction RFQs
- Indigenous language content detection
- Band-specific conversation rooms
- Verified business badges in chats
- Priority support channels

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.IO with Redis adapter
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3
- **Cache**: Redis
- **Testing**: Jest with 60% coverage

## Quick Start

```bash
npm install
docker-compose up
npm test
```

## API Endpoints

### REST API
- `GET /api/v1/conversations` - Get user conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/messages/:conversationId` - Get messages
- `POST /api/v1/messages` - Send message (fallback)

### WebSocket Events

#### Client → Server
- `join_conversation` - Join a conversation room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_read` - Mark message as read
- `add_reaction` - Add emoji reaction
- `share_file` - Share a file

#### Server → Client
- `new_message` - New message received
- `user_typing` - User is typing
- `message_read` - Message was read
- `reaction_added` - Reaction added to message
- `presence_update` - User presence changed

## Status

✅ **Production Ready** - 8 of 48 services complete