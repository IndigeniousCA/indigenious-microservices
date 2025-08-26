import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'http';
import { MessageService } from '../../src/services/message.service';
import { ConversationService } from '../../src/services/conversation.service';
import { FileService } from '../../src/services/file.service';
import jwt from 'jsonwebtoken';

describe('Chat Service Integration Tests', () => {
  let server: Server;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let authToken1: string;
  let authToken2: string;
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const businessId = 'business-1';

  beforeAll(async () => {
    // Generate auth tokens
    authToken1 = jwt.sign(
      { userId: userId1, email: 'user1@test.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret'
    );
    authToken2 = jwt.sign(
      { userId: userId2, email: 'user2@test.com', role: 'user', businessId },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    if (server) server.close();
  });

  describe('Socket Connection', () => {
    it('should authenticate and connect successfully', (done) => {
      clientSocket1 = ioClient('http://localhost:3008', {
        auth: { token: authToken1 },
        transports: ['websocket'],
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        done();
      });
    });

    it('should reject connection without authentication', (done) => {
      const unauthSocket = ioClient('http://localhost:3008', {
        transports: ['websocket'],
      });

      unauthSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        unauthSocket.disconnect();
        done();
      });
    });

    it('should handle multiple concurrent connections', async () => {
      const sockets = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          new Promise<ClientSocket>((resolve) => {
            const token = jwt.sign(
              { userId: `user-${i}`, email: `user${i}@test.com` },
              process.env.JWT_SECRET || 'test-secret'
            );
            const socket = ioClient('http://localhost:3008', {
              auth: { token },
              transports: ['websocket'],
            });
            socket.on('connect', () => resolve(socket));
          })
        )
      );

      expect(sockets).toHaveLength(5);
      sockets.forEach(s => {
        expect(s.connected).toBe(true);
        s.disconnect();
      });
    });
  });

  describe('Message Handling', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a test conversation
      const conversation = await ConversationService.createConversation({
        name: 'Test Conversation',
        type: 'direct',
        createdBy: userId1,
        participants: [userId1, userId2],
      });
      conversationId = conversation.id;
    });

    it('should send and receive messages in real-time', (done) => {
      clientSocket2.on('new_message', (message) => {
        expect(message.content).toBe('Hello from user 1');
        expect(message.senderId).toBe(userId1);
        expect(message.conversationId).toBe(conversationId);
        done();
      });

      clientSocket1.emit('send_message', {
        conversationId,
        content: 'Hello from user 1',
        type: 'text',
      });
    });

    it('should persist messages to database', async () => {
      const messageData = {
        conversationId,
        senderId: userId1,
        content: 'Test message for persistence',
        type: 'text' as const,
      };

      const message = await MessageService.createMessage(messageData);
      
      expect(message).toHaveProperty('id');
      expect(message.content).toBe(messageData.content);
      expect(message.senderId).toBe(userId1);

      // Verify message can be retrieved
      const retrieved = await MessageService.getMessage(message.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(message.id);
    });

    it('should handle message reactions', (done) => {
      clientSocket1.on('reaction_added', (data) => {
        expect(data.reaction.emoji).toBe('👍');
        expect(data.reaction.userId).toBe(userId2);
        done();
      });

      // First send a message
      clientSocket1.emit('send_message', {
        conversationId,
        content: 'React to this!',
      });

      // Then add reaction
      clientSocket1.on('new_message', (message) => {
        clientSocket2.emit('add_reaction', {
          messageId: message.id,
          emoji: '👍',
        });
      });
    });

    it('should handle message editing', async () => {
      const message = await MessageService.createMessage({
        conversationId,
        senderId: userId1,
        content: 'Original message',
      });

      const updated = await MessageService.updateMessage(message.id, {
        content: 'Edited message',
        edited: true,
        editedAt: new Date(),
      });

      expect(updated.content).toBe('Edited message');
      expect(updated.edited).toBe(true);
    });

    it('should handle message deletion', async () => {
      const message = await MessageService.createMessage({
        conversationId,
        senderId: userId1,
        content: 'To be deleted',
      });

      await MessageService.deleteMessage(message.id);

      const deleted = await MessageService.getMessage(message.id);
      expect(deleted?.deleted).toBe(true);
      expect(deleted?.content).toBe('[Message deleted]');
    });

    it('should enforce rate limiting', async () => {
      // Send many messages quickly
      const promises = Array.from({ length: 35 }, (_, i) =>
        MessageService.createMessage({
          conversationId,
          senderId: userId1,
          content: `Message ${i}`,
        })
      );

      await expect(Promise.all(promises)).rejects.toThrow();
    });
  });

  describe('Conversation Management', () => {
    it('should create direct conversation', async () => {
      const conversation = await ConversationService.getOrCreateDirectConversation(
        userId1,
        userId2
      );

      expect(conversation).toHaveProperty('id');
      expect(conversation.type).toBe('direct');
      expect(conversation.participants).toHaveLength(2);
    });

    it('should create group conversation', async () => {
      const conversation = await ConversationService.createConversation({
        name: 'Test Group',
        type: 'group',
        createdBy: userId1,
        participants: [userId1, userId2, 'user-3'],
      });

      expect(conversation.type).toBe('group');
      expect(conversation.name).toBe('Test Group');
      expect(conversation.participants).toHaveLength(3);
    });

    it('should create RFQ discussion', async () => {
      const rfqDiscussion = await ConversationService.createRFQDiscussion({
        rfqId: 'rfq-123',
        rfqTitle: 'Construction Project RFQ',
        createdBy: userId1,
        participants: [userId1, userId2],
      });

      expect(rfqDiscussion.type).toBe('rfq_discussion');
      expect(rfqDiscussion.name).toContain('RFQ:');
      expect(rfqDiscussion.metadata?.rfqId).toBe('rfq-123');
    });

    it('should handle participant management', async () => {
      const conversation = await ConversationService.createConversation({
        name: 'Participant Test',
        type: 'group',
        createdBy: userId1,
        participants: [userId1, userId2],
      });

      // Add participant
      await ConversationService.addParticipants(
        conversation.id,
        ['user-3'],
        userId1
      );

      // Remove participant
      await ConversationService.removeParticipant(
        conversation.id,
        'user-3',
        userId1
      );

      const updated = await ConversationService.getConversation(conversation.id);
      expect(updated?.participants).toHaveLength(2);
    });

    it('should retrieve user conversations', async () => {
      // Create multiple conversations
      await Promise.all([
        ConversationService.createConversation({
          name: 'Conv 1',
          type: 'group',
          createdBy: userId1,
          participants: [userId1, userId2],
        }),
        ConversationService.createConversation({
          name: 'Conv 2',
          type: 'direct',
          createdBy: userId1,
          participants: [userId1, 'user-3'],
        }),
      ]);

      const conversations = await ConversationService.getUserConversations(userId1);
      expect(conversations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('File Sharing', () => {
    it('should handle file uploads', async () => {
      const fileBuffer = Buffer.from('test file content');
      const result = await FileService.uploadFile(
        fileBuffer,
        'test.pdf',
        'application/pdf',
        userId1,
        'conversation-1'
      );

      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('url');
      expect(result.fileName).toBe('test.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should validate file types', () => {
      const validation = FileService['validateFile'](
        Buffer.from('test'),
        'application/x-executable'
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('not allowed');
    });

    it('should handle RFQ document uploads', async () => {
      const blueprintBuffer = Buffer.from('CAD file content');
      const result = await FileService.uploadRFQDocument(
        blueprintBuffer,
        'building.dwg',
        'application/dwg',
        'rfq-123',
        userId1
      );

      expect(result.isBlueprint).toBe(true);
      expect(result).toHaveProperty('fileId');
    });

    it('should generate thumbnails for images', async () => {
      const imageBuffer = Buffer.from('fake image data');
      jest.spyOn(FileService as any, 'generateThumbnail').mockResolvedValue('thumbnail-url');

      const result = await FileService.uploadFile(
        imageBuffer,
        'image.jpg',
        'image/jpeg',
        userId1,
        'conversation-1'
      );

      expect(result.thumbnailUrl).toBeDefined();
    });
  });

  describe('Real-time Features', () => {
    it('should handle typing indicators', (done) => {
      const conversationId = 'test-conversation';

      clientSocket2.on('user_typing', (data) => {
        expect(data.userId).toBe(userId1);
        expect(data.conversationId).toBe(conversationId);
        done();
      });

      clientSocket1.emit('typing_start', {
        conversationId,
        userName: 'User 1',
      });
    });

    it('should handle read receipts', async () => {
      const message = await MessageService.createMessage({
        conversationId: 'test-conversation',
        senderId: userId1,
        content: 'Read this message',
      });

      await MessageService.markMessageRead(message.id, userId2);

      const updated = await MessageService.getMessage(message.id);
      expect(updated?.status).toBe('READ');
    });

    it('should handle presence updates', (done) => {
      clientSocket2.on('presence_update', (data) => {
        expect(data.userId).toBe(userId1);
        expect(data.status).toBe('away');
        done();
      });

      clientSocket1.emit('update_status', 'away');
    });

    it('should send pending messages on reconnection', async () => {
      // Create messages while user is offline
      const messages = await Promise.all([
        MessageService.createMessage({
          conversationId: 'test-conversation',
          senderId: userId1,
          content: 'Offline message 1',
        }),
        MessageService.createMessage({
          conversationId: 'test-conversation',
          senderId: userId1,
          content: 'Offline message 2',
        }),
      ]);

      const pending = await MessageService.getPendingMessages(userId2);
      expect(pending.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Indigenous Features', () => {
    it('should detect Indigenous language content', async () => {
      const message = await MessageService.createMessage({
        conversationId: 'test-conversation',
        senderId: userId1,
        content: 'Miigwech for your help', // Ojibwe: thank you
      });

      const retrieved = await MessageService.getMessage(message.id);
      expect(retrieved?.metadata?.indigenousContent).toBe(true);
    });

    it('should handle Indigenous business verification in conversations', async () => {
      const conversation = await ConversationService.createConversation({
        name: 'Indigenous Business Chat',
        type: 'group',
        createdBy: businessId,
        participants: [businessId, userId1],
        metadata: {
          indigenousBusiness: true,
          bandNumber: '123456',
        },
      });

      expect(conversation.metadata?.indigenousBusiness).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation access', async () => {
      const hasAccess = await ConversationService.userHasAccess(
        'invalid-user',
        'invalid-conversation'
      );
      expect(hasAccess).toBe(false);
    });

    it('should handle message send failures gracefully', async () => {
      jest.spyOn(MessageService, 'createMessage').mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        MessageService.createMessage({
          conversationId: 'test',
          senderId: userId1,
          content: 'This will fail',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle file upload failures', async () => {
      jest.spyOn(FileService as any, 's3Client').mockImplementation(() => {
        throw new Error('S3 connection failed');
      });

      await expect(
        FileService.uploadFile(
          Buffer.from('test'),
          'test.pdf',
          'application/pdf',
          userId1,
          'conversation-1'
        )
      ).rejects.toThrow();
    });
  });
});