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

// RFQ-specific notification helpers
export async function notifyNewRFQ(rfq: any, recipientBusinessIds: string[]): Promise<void> {
  await sendNotification({
    type: 'rfq.new',
    recipients: recipientBusinessIds,
    data: {
      rfqId: rfq.id,
      title: rfq.title,
      category: rfq.category,
      closingDate: rfq.closing_date,
      budgetRange: {
        min: rfq.budget_min,
        max: rfq.budget_max
      }
    },
    priority: 'normal'
  });
}

export async function notifyBidSubmission(bid: any, rfqOwner: string): Promise<void> {
  await sendNotification({
    type: 'bid.submitted',
    recipients: [rfqOwner],
    data: {
      rfqId: bid.rfq_id,
      bidId: bid.id,
      businessName: bid.business_name,
      amount: bid.amount,
      submittedAt: bid.submitted_at
    },
    priority: 'normal'
  });
}

export async function notifyBidStatusUpdate(bid: any, businessId: string): Promise<void> {
  await sendNotification({
    type: 'bid.status_updated',
    recipients: [businessId],
    data: {
      rfqId: bid.rfq_id,
      bidId: bid.id,
      status: bid.status,
      feedback: bid.feedback
    },
    priority: 'high'
  });
}

export async function notifyRFQClosure(rfq: any, bidderBusinessIds: string[]): Promise<void> {
  await sendNotification({
    type: 'rfq.closed',
    recipients: bidderBusinessIds,
    data: {
      rfqId: rfq.id,
      title: rfq.title,
      closedAt: rfq.closed_at,
      finalStatus: rfq.status
    },
    priority: 'normal'
  });
}

export async function notifyContractAwarded(contract: any, winnerId: string, loserIds: string[]): Promise<void> {
  // Notify winner
  await sendNotification({
    type: 'contract.awarded',
    recipients: [winnerId],
    data: {
      rfqId: contract.rfq_id,
      contractId: contract.id,
      title: contract.rfq_title,
      amount: contract.amount,
      startDate: contract.start_date
    },
    priority: 'high'
  });

  // Notify losers
  if (loserIds.length > 0) {
    await sendNotification({
      type: 'bid.not_selected',
      recipients: loserIds,
      data: {
        rfqId: contract.rfq_id,
        title: contract.rfq_title,
        closedAt: contract.created_at
      },
      priority: 'normal'
    });
  }
}

export async function notifyRFQDeadlineReminder(rfq: any, interestedBusinessIds: string[]): Promise<void> {
  await sendNotification({
    type: 'rfq.deadline_reminder',
    recipients: interestedBusinessIds,
    data: {
      rfqId: rfq.id,
      title: rfq.title,
      closingDate: rfq.closing_date,
      hoursRemaining: Math.ceil((new Date(rfq.closing_date).getTime() - Date.now()) / (1000 * 60 * 60))
    },
    priority: 'high'
  });
}