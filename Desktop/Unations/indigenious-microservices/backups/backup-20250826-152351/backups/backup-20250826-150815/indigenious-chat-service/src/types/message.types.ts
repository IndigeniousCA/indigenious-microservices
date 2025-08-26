export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
  RFQ_UPDATE = 'rfq_update',
  CALL = 'call',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  type: MessageType;
  status: MessageStatus;
  metadata?: Record<string, any>;
  replyTo?: Message;
  replyToId?: string;
  reactions?: MessageReaction[];
  readBy?: MessageRead[];
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  metadata?: Record<string, any>;
  replyToId?: string;
  sensitive?: boolean;
}

export interface MessageUpdate {
  content?: string;
  edited?: boolean;
  editedAt?: Date;
  status?: MessageStatus;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface MessageRead {
  messageId: string;
  userId: string;
  readAt: Date;
}

export interface MessageFilter {
  conversationId?: string;
  senderId?: string;
  type?: MessageType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}