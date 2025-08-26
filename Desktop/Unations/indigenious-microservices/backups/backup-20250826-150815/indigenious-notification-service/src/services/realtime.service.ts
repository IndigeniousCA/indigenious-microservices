import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  businessId?: string;
  role?: string;
}

interface RealtimeNotification {
  id: string;
  type: 'rfq' | 'bid' | 'payment' | 'document' | 'message' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  timestamp: Date;
}

export class RealtimeService {
  private static io: SocketIOServer;
  private static connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private static socketToUser = new Map<string, string>(); // socketId -> userId

  /**
   * Setup Socket.IO handlers
   */
  static setupSocketHandlers(io: SocketIOServer): void {
    this.io = io;

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

        logger.info('Socket authenticated', {
          socketId: socket.id,
          userId: socket.userId,
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
      
      logger.info('User connected', {
        socketId: socket.id,
        userId,
      });

      // Track connection
      await this.handleUserConnection(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join business room if applicable
      if (socket.businessId) {
        socket.join(`business:${socket.businessId}`);
      }

      // Join role-based rooms
      if (socket.role) {
        socket.join(`role:${socket.role}`);
      }

      // Send pending notifications
      await this.sendPendingNotifications(socket);

      // Handle subscription to specific channels
      socket.on('subscribe', async (channels: string[]) => {
        for (const channel of channels) {
          // Validate channel access
          if (await this.canAccessChannel(userId, channel)) {
            socket.join(channel);
            logger.info('User subscribed to channel', { userId, channel });
          }
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (channels: string[]) => {
        for (const channel of channels) {
          socket.leave(channel);
          logger.info('User unsubscribed from channel', { userId, channel });
        }
      });

      // Handle notification acknowledgment
      socket.on('ack_notification', async (notificationId: string) => {
        await this.acknowledgeNotification(userId, notificationId);
      });

      // Handle typing indicators for chat
      socket.on('typing_start', (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId,
          conversationId: data.conversationId,
        });
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
          userId,
          conversationId: data.conversationId,
        });
      });

      // Handle presence updates
      socket.on('presence_update', async (status: 'online' | 'away' | 'busy') => {
        await this.updateUserPresence(userId, status);
        
        // Notify relevant users
        const contacts = await this.getUserContacts(userId);
        for (const contactId of contacts) {
          this.io.to(`user:${contactId}`).emit('presence_changed', {
            userId,
            status,
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        logger.info('User disconnected', {
          socketId: socket.id,
          userId,
        });

        await this.handleUserDisconnection(userId, socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  /**
   * Send notification to user(s)
   */
  static async sendNotification(
    recipients: string | string[],
    notification: Omit<RealtimeNotification, 'id' | 'timestamp'>
  ): Promise<void> {
    const notificationId = uuidv4();
    const timestamp = new Date();
    
    const fullNotification: RealtimeNotification = {
      id: notificationId,
      ...notification,
      timestamp,
    };

    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    for (const userId of recipientList) {
      // Send to all connected sockets for this user
      this.io.to(`user:${userId}`).emit('notification', fullNotification);

      // Store for offline delivery
      if (!this.isUserOnline(userId)) {
        await this.storePendingNotification(userId, fullNotification);
      }

      // Log notification
      logger.info('Notification sent', {
        notificationId,
        userId,
        type: notification.type,
      });
    }
  }

  /**
   * Broadcast to channel
   */
  static async broadcast(
    channel: string,
    event: string,
    data: any
  ): Promise<void> {
    this.io.to(channel).emit(event, data);
    
    logger.info('Broadcast sent', {
      channel,
      event,
      dataSize: JSON.stringify(data).length,
    });
  }

  /**
   * Send RFQ notification to Indigenous businesses
   */
  static async notifyIndigenousBusinessesRealtime(rfq: {
    id: string;
    title: string;
    category: string;
    deadline: Date;
    value: string;
  }): Promise<void> {
    const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
      type: 'rfq',
      title: 'New RFQ Opportunity',
      body: `${rfq.title} - Deadline: ${rfq.deadline.toLocaleDateString()}`,
      data: rfq,
      priority: 'high',
    };

    // Get matching Indigenous businesses
    const businesses = await prisma.indigenousBusiness.findMany({
      where: {
        categories: { has: rfq.category },
        active: true,
      },
      select: { userId: true },
    });

    const userIds = businesses.map(b => b.userId);
    
    // Send to Indigenous business channel
    this.io.to('channel:indigenous-businesses').emit('new_rfq', {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
    });

    // Send individual notifications
    await this.sendNotification(userIds, notification);
  }

  /**
   * Handle user connection
   */
  private static async handleUserConnection(
    userId: string,
    socketId: string
  ): Promise<void> {
    // Track socket
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
    this.socketToUser.set(socketId, userId);

    // Update Redis for distributed systems
    await redis.sadd(`online:users`, userId);
    await redis.hset(`user:sockets:${userId}`, socketId, Date.now().toString());

    // Set expiry for cleanup
    await redis.expire(`user:sockets:${userId}`, 86400); // 24 hours

    // Update last seen
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });
  }

  /**
   * Handle user disconnection
   */
  private static async handleUserDisconnection(
    userId: string,
    socketId: string
  ): Promise<void> {
    // Remove socket tracking
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        
        // User is offline - update Redis
        await redis.srem(`online:users`, userId);
        
        // Update last seen
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() },
        });
      }
    }
    
    this.socketToUser.delete(socketId);

    // Remove from Redis
    await redis.hdel(`user:sockets:${userId}`, socketId);
  }

  /**
   * Check if user is online
   */
  static isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get online users
   */
  static async getOnlineUsers(): Promise<string[]> {
    // Get from local map for this server
    const localUsers = Array.from(this.connectedUsers.keys());
    
    // Get from Redis for distributed system
    const redisUsers = await redis.smembers(`online:users`);
    
    // Combine and deduplicate
    return Array.from(new Set([...localUsers, ...redisUsers]));
  }

  /**
   * Store pending notification
   */
  private static async storePendingNotification(
    userId: string,
    notification: RealtimeNotification
  ): Promise<void> {
    const key = `pending:notifications:${userId}`;
    
    // Store in Redis with expiry
    await redis.lpush(key, JSON.stringify(notification));
    await redis.expire(key, 604800); // 7 days
    
    // Trim to last 100 notifications
    await redis.ltrim(key, 0, 99);
  }

  /**
   * Send pending notifications
   */
  private static async sendPendingNotifications(
    socket: AuthenticatedSocket
  ): Promise<void> {
    const userId = socket.userId!;
    const key = `pending:notifications:${userId}`;
    
    // Get pending notifications
    const pending = await redis.lrange(key, 0, -1);
    
    if (pending.length > 0) {
      // Send all pending notifications
      for (const notifStr of pending) {
        try {
          const notification = JSON.parse(notifStr);
          socket.emit('notification', notification);
        } catch (error) {
          logger.error('Failed to parse pending notification', error);
        }
      }
      
      // Clear pending notifications
      await redis.del(key);
      
      logger.info('Sent pending notifications', {
        userId,
        count: pending.length,
      });
    }
  }

  /**
   * Acknowledge notification
   */
  private static async acknowledgeNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    try {
      // Update in database
      await prisma.notificationAck.create({
        data: {
          notificationId,
          userId,
          acknowledgedAt: new Date(),
        },
      });
      
      logger.info('Notification acknowledged', {
        userId,
        notificationId,
      });
    } catch (error) {
      logger.error('Failed to acknowledge notification', error);
    }
  }

  /**
   * Check channel access
   */
  private static async canAccessChannel(
    userId: string,
    channel: string
  ): Promise<boolean> {
    // Implement channel access logic
    if (channel.startsWith('public:')) {
      return true;
    }
    
    if (channel.startsWith('indigenous:')) {
      const business = await prisma.indigenousBusiness.findFirst({
        where: { userId },
      });
      return !!business;
    }
    
    if (channel.startsWith('government:')) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { type: true },
      });
      return user?.type === 'government';
    }
    
    return false;
  }

  /**
   * Update user presence
   */
  private static async updateUserPresence(
    userId: string,
    status: 'online' | 'away' | 'busy'
  ): Promise<void> {
    await redis.hset(`user:presence`, userId, status);
    await redis.expire(`user:presence`, 3600); // 1 hour
  }

  /**
   * Get user contacts
   */
  private static async getUserContacts(userId: string): Promise<string[]> {
    // This would typically fetch from a contacts/connections table
    // For now, return empty array
    return [];
  }

  /**
   * Get connected socket IDs for user
   */
  static getSocketIds(userId: string): string[] {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Emit to specific socket
   */
  static emitToSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Get room members
   */
  static async getRoomMembers(room: string): Promise<string[]> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets
      .map(s => this.socketToUser.get(s.id))
      .filter(Boolean) as string[];
  }

  /**
   * Disconnect user
   */
  static disconnectUser(userId: string): void {
    const socketIds = this.getSocketIds(userId);
    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }
}

export function setupSocketHandlers(io: SocketIOServer): void {
  RealtimeService.setupSocketHandlers(io);
}

export default RealtimeService;