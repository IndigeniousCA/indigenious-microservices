import axios from 'axios';
import { logger } from './logger';

interface NotificationPayload {
  type: string;
  recipients: string[];
  data: any;
  priority?: 'low' | 'normal' | 'high';
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007';
    
    await axios.post(`${notificationServiceUrl}/api/notifications/send`, {
      type: payload.type,
      recipients: payload.recipients,
      data: payload.data,
      priority: payload.priority || 'normal',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN
      }
    });

    logger.info(`Notification sent: ${payload.type} to ${payload.recipients.length} recipients`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
    // Don't throw - notifications should not break the main flow
  }
}

export async function sendBulkNotifications(notifications: NotificationPayload[]): Promise<void> {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007';
    
    await axios.post(`${notificationServiceUrl}/api/notifications/bulk`, {
      notifications,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN
      }
    });

    logger.info(`Bulk notifications sent: ${notifications.length} notifications`);
  } catch (error) {
    logger.error('Failed to send bulk notifications:', error);
  }
}