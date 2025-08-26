import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  ConversationType,
  CreateConversationData,
  ConversationFilter,
  ConversationUpdate,
} from '../types/conversation.types';

export class ConversationService {
  private static readonly CONVERSATION_CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize conversation service
   */
  static async initialize(): Promise<void> {
    logger.info('Conversation service initialized');
  }

  /**
   * Create a new conversation
   */
  static async createConversation(data: CreateConversationData): Promise<Conversation> {
    try {
      const conversationId = uuidv4();

      // Ensure unique participants
      const uniqueParticipants = [...new Set(data.participants)];

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          id: conversationId,
          name: data.name,
          type: data.type || ConversationType.DIRECT,
          createdBy: data.createdBy,
          metadata: data.metadata || {},
          participants: {
            create: uniqueParticipants.map(userId => ({
              userId,
              role: userId === data.createdBy ? 'admin' : 'member',
              joinedAt: new Date(),
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
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
            },
          },
          lastMessage: true,
        },
      });

      // Cache conversation
      await this.cacheConversation(conversation);

      // Create system message for group conversations
      if (data.type === ConversationType.GROUP) {
        await this.createSystemMessage(conversationId, {
          content: `${data.createdBy} created the group "${data.name}"`,
          type: 'system',
        });
      }

      logger.info('Conversation created', {
        conversationId,
        type: data.type,
        participants: uniqueParticipants.length,
      });

      return this.formatConversation(conversation);
    } catch (error) {
      logger.error('Failed to create conversation', error);
      throw error;
    }
  }

  /**
   * Create RFQ discussion
   */
  static async createRFQDiscussion(data: {
    rfqId: string;
    rfqTitle: string;
    createdBy: string;
    participants: string[];
  }): Promise<Conversation> {
    try {
      const conversation = await this.createConversation({
        name: `RFQ: ${data.rfqTitle}`,
        type: ConversationType.RFQ_DISCUSSION,
        createdBy: data.createdBy,
        participants: data.participants,
        metadata: {
          rfqId: data.rfqId,
          rfqTitle: data.rfqTitle,
          isRFQDiscussion: true,
        },
      });

      // Create initial system message
      await this.createSystemMessage(conversation.id, {
        content: `RFQ discussion started for: ${data.rfqTitle}`,
        type: 'system',
        metadata: { rfqId: data.rfqId },
      });

      // Store RFQ-conversation mapping
      await redis.set(`rfq:conversation:${data.rfqId}`, conversation.id);

      logger.info('RFQ discussion created', {
        conversationId: conversation.id,
        rfqId: data.rfqId,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to create RFQ discussion', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  static async getConversation(
    conversationId: string,
    userId?: string
  ): Promise<Conversation | null> {
    try {
      // Check cache first
      const cached = await redis.get(`conversation:${conversationId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true,
                  lastSeen: true,
                  indigenousBusiness: {
                    select: {
                      name: true,
                      verified: true,
                      bandNumber: true,
                    },
                  },
                },
              },
            },
          },
          lastMessage: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        return null;
      }

      // Check user access if userId provided
      if (userId && !this.userHasAccess(userId, conversationId)) {
        return null;
      }

      const formatted = this.formatConversation(conversation);
      await this.cacheConversation(formatted);

      return formatted;
    } catch (error) {
      logger.error('Failed to get conversation', error);
      throw error;
    }
  }

  /**
   * Get user's conversations
   */
  static async getUserConversations(
    userId: string,
    filters: ConversationFilter = {}
  ): Promise<Conversation[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId },
          },
          ...(filters.type && { type: filters.type }),
          ...(filters.search && {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                messages: {
                  some: {
                    content: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }),
          ...(filters.hasUnread && {
            messages: {
              some: {
                senderId: { not: userId },
                readBy: {
                  none: { userId },
                },
              },
            },
          }),
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  lastSeen: true,
                },
              },
            },
          },
          lastMessage: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: userId },
                  readBy: {
                    none: { userId },
                  },
                },
              },
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      return conversations.map(conv => ({
        ...this.formatConversation(conv),
        unreadCount: conv._count.messages,
      }));
    } catch (error) {
      logger.error('Failed to get user conversations', error);
      throw error;
    }
  }

  /**
   * Update conversation
   */
  static async updateConversation(
    conversationId: string,
    updates: ConversationUpdate,
    userId: string
  ): Promise<Conversation> {
    try {
      // Check if user is admin
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      if (!participant || participant.role !== 'admin') {
        throw new Error('Only admins can update conversation');
      }

      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          lastMessage: true,
        },
      });

      // Invalidate cache
      await redis.del(`conversation:${conversationId}`);

      // Create system message for name change
      if (updates.name) {
        await this.createSystemMessage(conversationId, {
          content: `${userId} changed the group name to "${updates.name}"`,
          type: 'system',
        });
      }

      return this.formatConversation(conversation);
    } catch (error) {
      logger.error('Failed to update conversation', error);
      throw error;
    }
  }

  /**
   * Add participants to conversation
   */
  static async addParticipants(
    conversationId: string,
    userIds: string[],
    addedBy: string
  ): Promise<void> {
    try {
      // Check if user can add participants
      const conversation = await this.getConversation(conversationId);
      if (!conversation || conversation.type === ConversationType.DIRECT) {
        throw new Error('Cannot add participants to this conversation');
      }

      // Add participants
      await prisma.conversationParticipant.createMany({
        data: userIds.map(userId => ({
          conversationId,
          userId,
          role: 'member',
          joinedAt: new Date(),
        })),
        skipDuplicates: true,
      });

      // Create system message
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { name: true },
      });

      const names = users.map(u => u.name).join(', ');
      await this.createSystemMessage(conversationId, {
        content: `${addedBy} added ${names} to the conversation`,
        type: 'system',
      });

      // Invalidate cache
      await redis.del(`conversation:${conversationId}`);

      logger.info('Participants added to conversation', {
        conversationId,
        participants: userIds,
      });
    } catch (error) {
      logger.error('Failed to add participants', error);
      throw error;
    }
  }

  /**
   * Remove participant from conversation
   */
  static async removeParticipant(
    conversationId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      // Check permissions
      const remover = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: removedBy,
          },
        },
      });

      if (!remover || (remover.role !== 'admin' && removedBy !== userId)) {
        throw new Error('Insufficient permissions');
      }

      // Remove participant
      await prisma.conversationParticipant.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      // Create system message
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      const message = userId === removedBy
        ? `${user?.name} left the conversation`
        : `${removedBy} removed ${user?.name} from the conversation`;

      await this.createSystemMessage(conversationId, {
        content: message,
        type: 'system',
      });

      // Invalidate cache
      await redis.del(`conversation:${conversationId}`);

      logger.info('Participant removed from conversation', {
        conversationId,
        userId,
        removedBy,
      });
    } catch (error) {
      logger.error('Failed to remove participant', error);
      throw error;
    }
  }

  /**
   * Update last message
   */
  static async updateLastMessage(
    conversationId: string,
    messageId: string
  ): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: messageId,
          lastActivityAt: new Date(),
        },
      });

      // Invalidate cache
      await redis.del(`conversation:${conversationId}`);
    } catch (error) {
      logger.error('Failed to update last message', error);
    }
  }

  /**
   * Check if user has access to conversation
   */
  static async userHasAccess(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      return !!participant;
    } catch (error) {
      logger.error('Failed to check user access', error);
      return false;
    }
  }

  /**
   * Get or create direct conversation
   */
  static async getOrCreateDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation> {
    try {
      // Check if direct conversation already exists
      const existing = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          AND: [
            { participants: { some: { userId: userId1 } } },
            { participants: { some: { userId: userId2 } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          lastMessage: true,
        },
      });

      if (existing) {
        return this.formatConversation(existing);
      }

      // Create new direct conversation
      const users = await prisma.user.findMany({
        where: { id: { in: [userId1, userId2] } },
        select: { name: true },
      });

      const name = users.map(u => u.name).join(' & ');

      return await this.createConversation({
        name,
        type: ConversationType.DIRECT,
        createdBy: userId1,
        participants: [userId1, userId2],
      });
    } catch (error) {
      logger.error('Failed to get or create direct conversation', error);
      throw error;
    }
  }

  /**
   * Archive conversation
   */
  static async archiveConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          archived: true,
          archivedAt: new Date(),
        },
      });

      logger.info('Conversation archived', { conversationId, userId });
    } catch (error) {
      logger.error('Failed to archive conversation', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(conversationId: string): Promise<any> {
    try {
      const [messageCount, participantCount, fileCount] = await Promise.all([
        prisma.message.count({
          where: { conversationId },
        }),
        prisma.conversationParticipant.count({
          where: { conversationId },
        }),
        prisma.file.count({
          where: { conversationId },
        }),
      ]);

      const firstMessage = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const lastMessage = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return {
        messageCount,
        participantCount,
        fileCount,
        firstMessageAt: firstMessage?.createdAt,
        lastMessageAt: lastMessage?.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get conversation stats', error);
      throw error;
    }
  }

  /**
   * Create system message
   */
  private static async createSystemMessage(
    conversationId: string,
    data: any
  ): Promise<void> {
    try {
      await prisma.message.create({
        data: {
          id: uuidv4(),
          conversationId,
          senderId: 'system',
          content: data.content,
          type: 'system',
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      logger.error('Failed to create system message', error);
    }
  }

  /**
   * Cache conversation
   */
  private static async cacheConversation(conversation: any): Promise<void> {
    try {
      await redis.setex(
        `conversation:${conversation.id}`,
        this.CONVERSATION_CACHE_TTL,
        JSON.stringify(conversation)
      );
    } catch (error) {
      logger.error('Failed to cache conversation', error);
    }
  }

  /**
   * Format conversation for response
   */
  private static formatConversation(conversation: any): Conversation {
    return {
      id: conversation.id,
      name: conversation.name,
      type: conversation.type,
      participants: conversation.participants,
      lastMessage: conversation.lastMessage,
      lastActivityAt: conversation.lastActivityAt,
      createdBy: conversation.createdBy,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}

export default ConversationService;