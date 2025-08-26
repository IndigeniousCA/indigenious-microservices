import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { PresenceService } from '../services/presence.service';
import { TypingService } from '../services/typing.service';
import { NotificationService } from '../services/notification.service';
import { 
  MessageData, 
  TypingData, 
  ReadReceiptData,
  FileShareData,
  ReactionData 
} from '../types/socket.types';
import { sanitizeMessage } from '../utils/sanitizer';
import { validateMessage } from '../utils/validator';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  businessId?: string;
  role?: string;
  conversations?: Set<string>;
}

export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token.replace('Bearer ', ''),
        process.env.JWT_SECRET || 'secret'
      ) as any;

      socket.userId = decoded.userId;
      socket.businessId = decoded.businessId;
      socket.role = decoded.role;
      socket.conversations = new Set();

      logger.info('Socket authenticated', {
        socketId: socket.id,
        userId: socket.userId,
        role: socket.role,
      });

      next();
    } catch (error) {
      logger.error('Socket authentication failed', error);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    
    logger.info('User connected to chat', {
      socketId: socket.id,
      userId,
      businessId: socket.businessId,
    });

    try {
      // Update user presence
      await PresenceService.setUserOnline(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join business room if applicable
      if (socket.businessId) {
        socket.join(`business:${socket.businessId}`);
      }

      // Load and join user's active conversations
      const conversations = await ConversationService.getUserConversations(userId);
      for (const conv of conversations) {
        socket.join(`conversation:${conv.id}`);
        socket.conversations?.add(conv.id);
      }

      // Notify contacts about online status
      await notifyPresenceChange(io, userId, 'online');

      // Send pending messages
      await sendPendingMessages(socket, userId);

      // Handle joining conversation
      socket.on('join_conversation', async (conversationId: string) => {
        try {
          // Verify user has access
          const hasAccess = await ConversationService.userHasAccess(userId, conversationId);
          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied to conversation' });
            return;
          }

          socket.join(`conversation:${conversationId}`);
          socket.conversations?.add(conversationId);

          // Mark messages as delivered
          await MessageService.markMessagesDelivered(conversationId, userId);

          // Load conversation history
          const messages = await MessageService.getConversationMessages(conversationId, {
            limit: 50,
            userId,
          });

          socket.emit('conversation_history', {
            conversationId,
            messages,
          });

          logger.info('User joined conversation', { userId, conversationId });
        } catch (error) {
          logger.error('Failed to join conversation', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversation
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        socket.conversations?.delete(conversationId);
        logger.info('User left conversation', { userId, conversationId });
      });

      // Handle sending message
      socket.on('send_message', async (data: MessageData) => {
        try {
          // Validate and sanitize message
          const validation = validateMessage(data);
          if (!validation.valid) {
            socket.emit('error', { message: validation.error });
            return;
          }

          const sanitizedContent = sanitizeMessage(data.content);

          // Check rate limiting
          const canSend = await MessageService.checkRateLimit(userId);
          if (!canSend) {
            socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
            return;
          }

          // Save message to database
          const message = await MessageService.createMessage({
            conversationId: data.conversationId,
            senderId: userId,
            content: sanitizedContent,
            type: data.type || 'text',
            metadata: data.metadata,
            replyToId: data.replyToId,
          });

          // Emit to conversation participants
          io.to(`conversation:${data.conversationId}`).emit('new_message', {
            ...message,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
          });

          // Send push notifications to offline users
          await NotificationService.notifyOfflineUsers(
            data.conversationId,
            userId,
            message
          );

          // Update conversation last message
          await ConversationService.updateLastMessage(data.conversationId, message.id);

          logger.info('Message sent', {
            messageId: message.id,
            conversationId: data.conversationId,
            senderId: userId,
          });
        } catch (error) {
          logger.error('Failed to send message', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle file sharing
      socket.on('share_file', async (data: FileShareData) => {
        try {
          // Validate file
          if (!data.fileUrl || !data.fileName) {
            socket.emit('error', { message: 'Invalid file data' });
            return;
          }

          // Create file message
          const message = await MessageService.createMessage({
            conversationId: data.conversationId,
            senderId: userId,
            content: data.fileName,
            type: 'file',
            metadata: {
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileSize: data.fileSize,
              mimeType: data.mimeType,
              thumbnailUrl: data.thumbnailUrl,
            },
          });

          // Emit to conversation
          io.to(`conversation:${data.conversationId}`).emit('new_message', message);

          logger.info('File shared', {
            messageId: message.id,
            fileName: data.fileName,
          });
        } catch (error) {
          logger.error('Failed to share file', error);
          socket.emit('error', { message: 'Failed to share file' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', async (data: TypingData) => {
        await TypingService.setTyping(userId, data.conversationId, true);
        
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId,
          conversationId: data.conversationId,
          userName: data.userName,
        });
      });

      socket.on('typing_stop', async (data: TypingData) => {
        await TypingService.setTyping(userId, data.conversationId, false);
        
        socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
          userId,
          conversationId: data.conversationId,
        });
      });

      // Handle read receipts
      socket.on('mark_read', async (data: ReadReceiptData) => {
        try {
          await MessageService.markMessageRead(data.messageId, userId);
          
          // Notify sender
          const message = await MessageService.getMessage(data.messageId);
          if (message) {
            io.to(`user:${message.senderId}`).emit('message_read', {
              messageId: data.messageId,
              readBy: userId,
              readAt: new Date(),
            });
          }

          logger.info('Message marked as read', {
            messageId: data.messageId,
            userId,
          });
        } catch (error) {
          logger.error('Failed to mark message as read', error);
        }
      });

      // Handle message reactions
      socket.on('add_reaction', async (data: ReactionData) => {
        try {
          const reaction = await MessageService.addReaction({
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
          });

          // Get message to find conversation
          const message = await MessageService.getMessage(data.messageId);
          if (message) {
            io.to(`conversation:${message.conversationId}`).emit('reaction_added', {
              messageId: data.messageId,
              reaction,
            });
          }

          logger.info('Reaction added', {
            messageId: data.messageId,
            emoji: data.emoji,
          });
        } catch (error) {
          logger.error('Failed to add reaction', error);
          socket.emit('error', { message: 'Failed to add reaction' });
        }
      });

      // Handle message deletion
      socket.on('delete_message', async (messageId: string) => {
        try {
          const message = await MessageService.getMessage(messageId);
          
          // Verify sender or admin
          if (message?.senderId !== userId && socket.role !== 'admin') {
            socket.emit('error', { message: 'Unauthorized to delete message' });
            return;
          }

          await MessageService.deleteMessage(messageId);
          
          io.to(`conversation:${message.conversationId}`).emit('message_deleted', {
            messageId,
            deletedBy: userId,
          });

          logger.info('Message deleted', { messageId, userId });
        } catch (error) {
          logger.error('Failed to delete message', error);
          socket.emit('error', { message: 'Failed to delete message' });
        }
      });

      // Handle message editing
      socket.on('edit_message', async (data: { messageId: string; content: string }) => {
        try {
          const message = await MessageService.getMessage(data.messageId);
          
          // Verify sender
          if (message?.senderId !== userId) {
            socket.emit('error', { message: 'Unauthorized to edit message' });
            return;
          }

          const sanitizedContent = sanitizeMessage(data.content);
          const updated = await MessageService.updateMessage(data.messageId, {
            content: sanitizedContent,
            edited: true,
            editedAt: new Date(),
          });

          io.to(`conversation:${message.conversationId}`).emit('message_edited', updated);

          logger.info('Message edited', { messageId: data.messageId });
        } catch (error) {
          logger.error('Failed to edit message', error);
          socket.emit('error', { message: 'Failed to edit message' });
        }
      });

      // Handle creating RFQ discussion
      socket.on('create_rfq_discussion', async (data: {
        rfqId: string;
        rfqTitle: string;
        participants: string[];
      }) => {
        try {
          // Create RFQ-specific conversation
          const conversation = await ConversationService.createRFQDiscussion({
            rfqId: data.rfqId,
            rfqTitle: data.rfqTitle,
            createdBy: userId,
            participants: [...data.participants, userId],
          });

          // Join all online participants
          for (const participantId of data.participants) {
            const participantSocket = await PresenceService.getUserSocket(participantId);
            if (participantSocket) {
              io.sockets.sockets.get(participantSocket)?.join(`conversation:${conversation.id}`);
            }
          }

          socket.emit('rfq_discussion_created', conversation);

          logger.info('RFQ discussion created', {
            conversationId: conversation.id,
            rfqId: data.rfqId,
          });
        } catch (error) {
          logger.error('Failed to create RFQ discussion', error);
          socket.emit('error', { message: 'Failed to create RFQ discussion' });
        }
      });

      // Handle video call signaling
      socket.on('call_user', async (data: {
        targetUserId: string;
        conversationId: string;
        signalData: any;
      }) => {
        const targetSocket = await PresenceService.getUserSocket(data.targetUserId);
        if (targetSocket) {
          io.to(targetSocket).emit('incoming_call', {
            from: userId,
            conversationId: data.conversationId,
            signalData: data.signalData,
          });
        }
      });

      socket.on('answer_call', async (data: {
        targetUserId: string;
        signalData: any;
      }) => {
        const targetSocket = await PresenceService.getUserSocket(data.targetUserId);
        if (targetSocket) {
          io.to(targetSocket).emit('call_answered', {
            from: userId,
            signalData: data.signalData,
          });
        }
      });

      // Handle presence updates
      socket.on('update_status', async (status: 'online' | 'away' | 'busy' | 'offline') => {
        await PresenceService.updateUserStatus(userId, status);
        await notifyPresenceChange(io, userId, status);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        logger.info('User disconnected from chat', {
          socketId: socket.id,
          userId,
        });

        // Clear typing indicators
        for (const conversationId of socket.conversations || []) {
          await TypingService.setTyping(userId, conversationId, false);
          socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
            userId,
            conversationId,
          });
        }

        // Update presence
        await PresenceService.setUserOffline(userId, socket.id);
        
        // Check if user has other active connections
        const isStillOnline = await PresenceService.isUserOnline(userId);
        if (!isStillOnline) {
          await notifyPresenceChange(io, userId, 'offline');
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });

    } catch (error) {
      logger.error('Error in socket connection handler', error);
      socket.disconnect();
    }
  });
}

// Helper functions
async function notifyPresenceChange(
  io: SocketIOServer,
  userId: string,
  status: string
): Promise<void> {
  try {
    // Get user's conversations
    const conversations = await ConversationService.getUserConversations(userId);
    
    // Notify all conversation participants
    const notifiedUsers = new Set<string>();
    
    for (const conv of conversations) {
      for (const participantId of conv.participants) {
        if (participantId !== userId && !notifiedUsers.has(participantId)) {
          io.to(`user:${participantId}`).emit('presence_update', {
            userId,
            status,
            timestamp: new Date(),
          });
          notifiedUsers.add(participantId);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to notify presence change', error);
  }
}

async function sendPendingMessages(
  socket: AuthenticatedSocket,
  userId: string
): Promise<void> {
  try {
    // Get undelivered messages
    const pendingMessages = await MessageService.getPendingMessages(userId);
    
    if (pendingMessages.length > 0) {
      socket.emit('pending_messages', pendingMessages);
      
      // Mark as delivered
      const messageIds = pendingMessages.map(m => m.id);
      await MessageService.markMessagesDeliveredBatch(messageIds, userId);
      
      logger.info('Sent pending messages', {
        userId,
        count: pendingMessages.length,
      });
    }
  } catch (error) {
    logger.error('Failed to send pending messages', error);
  }
}