import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  MessageType, 
  MessageStatus,
  CreateMessageData,
  MessageFilter,
  MessageUpdate 
} from '../types/message.types';
import { NotificationService } from './notification.service';
import { FileService } from './file.service';
import { encryptMessage, decryptMessage } from '../utils/encryption';

export class MessageService {
  private static readonly RATE_LIMIT_WINDOW = 60; // 1 minute
  private static readonly RATE_LIMIT_MAX = 30; // 30 messages per minute
  private static readonly MESSAGE_CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize message service
   */
  static async initialize(): Promise<void> {
    logger.info('Message service initialized');
  }

  /**
   * Create a new message
   */
  static async createMessage(data: CreateMessageData): Promise<Message> {
    try {
      const messageId = uuidv4();

      // Encrypt message content for sensitive conversations
      const encryptedContent = data.sensitive 
        ? await encryptMessage(data.content)
        : data.content;

      // Handle file attachments
      let fileData = null;
      if (data.type === 'file' && data.metadata?.fileUrl) {
        fileData = await FileService.processFileAttachment({
          url: data.metadata.fileUrl,
          fileName: data.metadata.fileName,
          mimeType: data.metadata.mimeType,
          size: data.metadata.fileSize,
        });
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          id: messageId,
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: encryptedContent,
          type: data.type || MessageType.TEXT,
          status: MessageStatus.SENT,
          metadata: {
            ...data.metadata,
            ...(fileData && { file: fileData }),
            encrypted: data.sensitive || false,
          },
          replyToId: data.replyToId,
          createdAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              sender: {
                select: {
                  name: true,
                },
              },
            },
          },
          reactions: true,
          readBy: true,
        },
      });

      // Cache message
      await this.cacheMessage(message);

      // Update conversation activity
      await this.updateConversationActivity(data.conversationId, messageId);

      // Handle mentions
      if (data.content.includes('@')) {
        await this.processMentions(message);
      }

      // Check for Indigenous language content
      if (await this.containsIndigenousLanguage(data.content)) {
        await this.flagIndigenousContent(messageId);
      }

      logger.info('Message created', {
        messageId,
        conversationId: data.conversationId,
        type: data.type,
      });

      return this.formatMessage(message);
    } catch (error) {
      logger.error('Failed to create message', error);
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  static async getMessage(messageId: string): Promise<Message | null> {
    try {
      // Check cache first
      const cached = await redis.get(`message:${messageId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
          replyTo: true,
          reactions: true,
          readBy: true,
        },
      });

      if (!message) {
        return null;
      }

      const formatted = this.formatMessage(message);
      await this.cacheMessage(formatted);
      
      return formatted;
    } catch (error) {
      logger.error('Failed to get message', error);
      throw error;
    }
  }

  /**
   * Get conversation messages with pagination
   */
  static async getConversationMessages(
    conversationId: string,
    options: {
      limit?: number;
      offset?: number;
      before?: Date;
      after?: Date;
      userId?: string;
    } = {}
  ): Promise<Message[]> {
    try {
      const {
        limit = 50,
        offset = 0,
        before,
        after,
        userId,
      } = options;

      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(before && { createdAt: { lt: before } }),
          ...(after && { createdAt: { gt: after } }),
          deleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              indigenousBusiness: {
                select: {
                  name: true,
                  verified: true,
                },
              },
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              sender: {
                select: {
                  name: true,
                },
              },
            },
          },
          reactions: true,
          readBy: userId ? {
            where: { userId },
          } : true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      // Decrypt sensitive messages if authorized
      const decryptedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.metadata?.encrypted && userId) {
            const hasAccess = await this.userCanAccessMessage(userId, message.id);
            if (hasAccess) {
              message.content = await decryptMessage(message.content);
            } else {
              message.content = '[Encrypted message]';
            }
          }
          return this.formatMessage(message);
        })
      );

      return decryptedMessages;
    } catch (error) {
      logger.error('Failed to get conversation messages', error);
      throw error;
    }
  }

  /**
   * Update message
   */
  static async updateMessage(
    messageId: string,
    updates: MessageUpdate
  ): Promise<Message> {
    try {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          reactions: true,
          readBy: true,
        },
      });

      // Invalidate cache
      await redis.del(`message:${messageId}`);

      return this.formatMessage(message);
    } catch (error) {
      logger.error('Failed to update message', error);
      throw error;
    }
  }

  /**
   * Delete message (soft delete)
   */
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          deleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
        },
      });

      // Invalidate cache
      await redis.del(`message:${messageId}`);

      logger.info('Message deleted', { messageId });
    } catch (error) {
      logger.error('Failed to delete message', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  static async markMessageRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if already read
      const existing = await prisma.messageRead.findUnique({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
      });

      if (!existing) {
        await prisma.messageRead.create({
          data: {
            messageId,
            userId,
            readAt: new Date(),
          },
        });

        // Update message status if sender
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (message && message.status === MessageStatus.DELIVERED) {
          await prisma.message.update({
            where: { id: messageId },
            data: { status: MessageStatus.READ },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to mark message as read', error);
    }
  }

  /**
   * Mark messages as delivered
   */
  static async markMessagesDelivered(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: MessageStatus.SENT,
        },
        data: {
          status: MessageStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to mark messages as delivered', error);
    }
  }

  /**
   * Mark batch of messages as delivered
   */
  static async markMessagesDeliveredBatch(
    messageIds: string[],
    userId: string
  ): Promise<void> {
    try {
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          senderId: { not: userId },
          status: MessageStatus.SENT,
        },
        data: {
          status: MessageStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to mark messages as delivered', error);
    }
  }

  /**
   * Get pending messages for user
   */
  static async getPendingMessages(userId: string): Promise<Message[]> {
    try {
      // Get user's conversations
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId },
          },
        },
        select: { id: true },
      });

      const conversationIds = conversations.map(c => c.id);

      // Get undelivered messages
      const messages = await prisma.message.findMany({
        where: {
          conversationId: { in: conversationIds },
          senderId: { not: userId },
          status: MessageStatus.SENT,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          conversation: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 100, // Limit to 100 pending messages
      });

      return messages.map(m => this.formatMessage(m));
    } catch (error) {
      logger.error('Failed to get pending messages', error);
      return [];
    }
  }

  /**
   * Add reaction to message
   */
  static async addReaction(data: {
    messageId: string;
    userId: string;
    emoji: string;
  }): Promise<any> {
    try {
      // Check if reaction already exists
      const existing = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: data.messageId,
            userId: data.userId,
            emoji: data.emoji,
          },
        },
      });

      if (existing) {
        // Remove reaction if already exists (toggle)
        await prisma.messageReaction.delete({
          where: { id: existing.id },
        });
        return { action: 'removed', ...data };
      }

      // Add new reaction
      const reaction = await prisma.messageReaction.create({
        data: {
          messageId: data.messageId,
          userId: data.userId,
          emoji: data.emoji,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return { action: 'added', ...reaction };
    } catch (error) {
      logger.error('Failed to add reaction', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  static async searchMessages(
    userId: string,
    query: string,
    filters: MessageFilter = {}
  ): Promise<Message[]> {
    try {
      // Get user's accessible conversations
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId },
          },
        },
        select: { id: true },
      });

      const conversationIds = conversations.map(c => c.id);

      const messages = await prisma.message.findMany({
        where: {
          conversationId: { in: conversationIds },
          content: {
            contains: query,
            mode: 'insensitive',
          },
          ...(filters.conversationId && { conversationId: filters.conversationId }),
          ...(filters.senderId && { senderId: filters.senderId }),
          ...(filters.type && { type: filters.type }),
          ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
          ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
          deleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          conversation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
      });

      return messages.map(m => this.formatMessage(m));
    } catch (error) {
      logger.error('Failed to search messages', error);
      throw error;
    }
  }

  /**
   * Check rate limiting
   */
  static async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const key = `rate:message:${userId}`;
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.expire(key, this.RATE_LIMIT_WINDOW);
      }
      
      return count <= this.RATE_LIMIT_MAX;
    } catch (error) {
      logger.error('Failed to check rate limit', error);
      return true; // Allow on error
    }
  }

  /**
   * Process mentions in message
   */
  private static async processMentions(message: any): Promise<void> {
    try {
      const mentionRegex = /@(\w+)/g;
      const matches = message.content.matchAll(mentionRegex);
      
      for (const match of matches) {
        const username = match[1];
        
        // Find user by username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username },
              { name: { contains: username, mode: 'insensitive' } },
            ],
          },
        });

        if (user) {
          // Create mention notification
          await NotificationService.createMentionNotification({
            userId: user.id,
            messageId: message.id,
            conversationId: message.conversationId,
            mentionedBy: message.senderId,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process mentions', error);
    }
  }

  /**
   * Check for Indigenous language content
   */
  private static async containsIndigenousLanguage(content: string): Promise<boolean> {
    // Check for common Indigenous language patterns
    // This is a simplified check - in production, use proper language detection
    const indigenousPatterns = [
      /\bmigwech\b/i, // Ojibwe: thank you
      /\bchi-miigwech\b/i, // Ojibwe: thank you very much
      /\btansi\b/i, // Cree: hello
      /\bkwe\b/i, // Various: hello/woman
      /\bmarsee\b/i, // Michif: thank you
      /\bwela'lin\b/i, // Mi'kmaq: thank you
    ];

    return indigenousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Flag message with Indigenous content
   */
  private static async flagIndigenousContent(messageId: string): Promise<void> {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: {
            indigenousContent: true,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to flag Indigenous content', error);
    }
  }

  /**
   * Check if user can access message
   */
  private static async userCanAccessMessage(
    userId: string,
    messageId: string
  ): Promise<boolean> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!message) return false;

      return message.conversation.participants.some(p => p.userId === userId);
    } catch (error) {
      logger.error('Failed to check message access', error);
      return false;
    }
  }

  /**
   * Update conversation activity
   */
  private static async updateConversationActivity(
    conversationId: string,
    lastMessageId: string
  ): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId,
          lastActivityAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update conversation activity', error);
    }
  }

  /**
   * Cache message
   */
  private static async cacheMessage(message: any): Promise<void> {
    try {
      await redis.setex(
        `message:${message.id}`,
        this.MESSAGE_CACHE_TTL,
        JSON.stringify(message)
      );
    } catch (error) {
      logger.error('Failed to cache message', error);
    }
  }

  /**
   * Format message for response
   */
  private static formatMessage(message: any): Message {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: message.sender,
      content: message.content,
      type: message.type,
      status: message.status,
      metadata: message.metadata,
      replyTo: message.replyTo,
      reactions: message.reactions || [],
      readBy: message.readBy || [],
      edited: message.edited || false,
      editedAt: message.editedAt,
      deleted: message.deleted || false,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}

export default MessageService;