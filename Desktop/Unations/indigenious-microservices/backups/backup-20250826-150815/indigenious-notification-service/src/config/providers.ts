import { logger } from '../utils/logger';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import * as admin from 'firebase-admin';
import webpush from 'web-push';

/**
 * Initialize all notification providers
 */
export async function initializeProviders(): Promise<void> {
  try {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('SendGrid initialized');
    } else {
      logger.warn('SendGrid API key not provided');
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      // Test connection
      await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      logger.info('Twilio initialized');
    } else {
      logger.warn('Twilio credentials not provided');
    }

    // Initialize Firebase Admin
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        logger.info('Firebase Admin initialized');
      } catch (error) {
        logger.error('Failed to initialize Firebase Admin', error);
      }
    } else {
      logger.warn('Firebase service account not provided');
    }

    // Initialize Web Push
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:push@indigenous.ca',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      logger.info('Web Push initialized');
    } else {
      logger.warn('VAPID keys not provided');
    }

    logger.info('Notification providers initialization complete');
  } catch (error) {
    logger.error('Failed to initialize notification providers', error);
    throw error;
  }
}

/**
 * Check provider health
 */
export async function checkProvidersHealth(): Promise<{
  sendgrid: boolean;
  twilio: boolean;
  firebase: boolean;
  webpush: boolean;
}> {
  const health = {
    sendgrid: false,
    twilio: false,
    firebase: false,
    webpush: false,
  };

  // Check SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      // SendGrid doesn't have a direct health check, but we can verify the API key is set
      health.sendgrid = true;
    } catch (error) {
      logger.error('SendGrid health check failed', error);
    }
  }

  // Check Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      health.twilio = true;
    } catch (error) {
      logger.error('Twilio health check failed', error);
    }
  }

  // Check Firebase
  if (admin.apps.length > 0) {
    health.firebase = true;
  }

  // Check Web Push
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    health.webpush = true;
  }

  return health;
}

export default {
  initializeProviders,
  checkProvidersHealth,
};