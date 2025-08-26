import twilio from 'twilio';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface SMSOptions {
  to: string | string[];
  message: string;
  from?: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  priority?: 'high' | 'normal' | 'low';
  maxPrice?: number;
  attempt?: number;
  validityPeriod?: number;
  statusCallback?: string;
  language?: string;
  isIndigenous?: boolean;
}

export interface SMSResult {
  messageId: string;
  to: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  price?: string;
  priceUnit?: string;
  dateCreated: Date;
}

export interface BulkSMSResult {
  successful: Array<{ to: string; messageId: string }>;
  failed: Array<{ to: string; error: string }>;
  totalCost?: number;
}

export class SMSService {
  private static twilioClient: twilio.Twilio;
  private static fromNumber: string;
  private static readonly MAX_MESSAGE_LENGTH = 1600;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 2000;
  private static readonly RATE_LIMIT_PER_MINUTE = 30;
  private static readonly INDIGENOUS_SMS_PREFIX = '🌿 '; // Cultural identifier

  /**
   * Initialize SMS service
   */
  static async initialize(): Promise<void> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      this.twilioClient = twilio(accountSid, authToken);

      // Verify account
      const account = await this.twilioClient.api.accounts(accountSid).fetch();
      logger.info('SMS service initialized', {
        accountName: account.friendlyName,
        status: account.status,
      });
    } catch (error) {
      logger.error('Failed to initialize SMS service', error);
      throw error;
    }
  }

  /**
   * Send SMS message
   */
  static async sendSMS(options: SMSOptions): Promise<SMSResult> {
    try {
      // Validate phone numbers
      const toNumbers = Array.isArray(options.to) ? options.to : [options.to];
      const validatedNumbers = await this.validatePhoneNumbers(toNumbers);

      if (validatedNumbers.length === 0) {
        throw new Error('No valid phone numbers provided');
      }

      // Check rate limiting
      await this.checkRateLimit(validatedNumbers[0]);

      // Format message with Indigenous elements if needed
      let message = options.message;
      if (options.isIndigenous) {
        message = this.formatIndigenousMessage(message, options.language);
      }

      // Ensure message doesn't exceed limit
      if (message.length > this.MAX_MESSAGE_LENGTH) {
        message = message.substring(0, this.MAX_MESSAGE_LENGTH - 3) + '...';
      }

      // Send to single recipient (for multiple, use sendBulkSMS)
      const to = validatedNumbers[0];
      
      const messageOptions: any = {
        body: message,
        from: options.from || this.fromNumber,
        to,
      };

      // Add media URLs for MMS
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        messageOptions.mediaUrl = options.mediaUrls;
      }

      // Add scheduling
      if (options.scheduledAt && options.scheduledAt > new Date()) {
        messageOptions.sendAt = options.scheduledAt.toISOString();
      }

      // Add status callback
      if (options.statusCallback) {
        messageOptions.statusCallback = options.statusCallback;
      }

      // Set validity period
      if (options.validityPeriod) {
        messageOptions.validityPeriod = options.validityPeriod;
      }

      // Set max price
      if (options.maxPrice) {
        messageOptions.maxPrice = options.maxPrice.toString();
      }

      // Send message
      const twilioMessage = await this.twilioClient.messages.create(messageOptions);

      const result: SMSResult = {
        messageId: twilioMessage.sid,
        to: twilioMessage.to,
        status: twilioMessage.status,
        errorCode: twilioMessage.errorCode?.toString(),
        errorMessage: twilioMessage.errorMessage,
        price: twilioMessage.price,
        priceUnit: twilioMessage.priceUnit,
        dateCreated: twilioMessage.dateCreated,
      };

      // Log SMS sent
      await this.logSMSSent(options, result);

      // Store in notification history
      await this.storeNotificationHistory(options, result);

      return result;
    } catch (error: any) {
      logger.error('Failed to send SMS', error);
      
      // Retry logic
      if (this.shouldRetry(error) && (!options.attempt || options.attempt < this.MAX_RETRY_ATTEMPTS)) {
        return this.retrySMS(options);
      }
      
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  static async sendBulkSMS(
    recipients: string[],
    options: Omit<SMSOptions, 'to'>
  ): Promise<BulkSMSResult> {
    const successful: Array<{ to: string; messageId: string }> = [];
    const failed: Array<{ to: string; error: string }> = [];
    let totalCost = 0;

    // Validate all phone numbers
    const validatedNumbers = await this.validatePhoneNumbers(recipients);

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < validatedNumbers.length; i += batchSize) {
      const batch = validatedNumbers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (phoneNumber) => {
          try {
            const result = await this.sendSMS({ ...options, to: phoneNumber });
            successful.push({ to: phoneNumber, messageId: result.messageId });
            
            if (result.price) {
              totalCost += parseFloat(result.price);
            }
          } catch (error: any) {
            failed.push({ to: phoneNumber, error: error.message });
            logger.error(`Failed to send SMS to ${phoneNumber}`, error);
          }
        })
      );

      // Rate limiting between batches
      if (i + batchSize < validatedNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { successful, failed, totalCost };
  }

  /**
   * Send Indigenous language SMS
   */
  static async sendIndigenousSMS(
    options: SMSOptions & { 
      indigenousLanguage: string;
      includeTranslation?: boolean;
    }
  ): Promise<SMSResult> {
    try {
      // Get Indigenous greeting and closing
      const greeting = this.getIndigenousGreeting(options.indigenousLanguage);
      const closing = this.getIndigenousClosing(options.indigenousLanguage);

      // Format message with cultural elements
      let formattedMessage = `${greeting}\n\n${options.message}\n\n${closing}`;

      // Add English translation if requested
      if (options.includeTranslation) {
        formattedMessage += `\n\n[English: ${options.message}]`;
      }

      return this.sendSMS({
        ...options,
        message: formattedMessage,
        isIndigenous: true,
      });
    } catch (error) {
      logger.error('Failed to send Indigenous SMS', error);
      throw error;
    }
  }

  /**
   * Send verification code SMS
   */
  static async sendVerificationCode(
    phoneNumber: string,
    code: string,
    language?: string
  ): Promise<SMSResult> {
    const message = language === 'fr' 
      ? `Votre code de vérification est: ${code}`
      : `Your verification code is: ${code}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'high',
    });
  }

  /**
   * Send appointment reminder
   */
  static async sendAppointmentReminder(
    phoneNumber: string,
    appointmentDetails: {
      date: Date;
      time: string;
      location: string;
      type: string;
    },
    language?: string
  ): Promise<SMSResult> {
    const formattedDate = appointmentDetails.date.toLocaleDateString('en-CA');
    
    let message: string;
    if (language === 'fr') {
      message = `Rappel: Votre ${appointmentDetails.type} est prévu le ${formattedDate} à ${appointmentDetails.time} à ${appointmentDetails.location}`;
    } else {
      message = `Reminder: Your ${appointmentDetails.type} is scheduled for ${formattedDate} at ${appointmentDetails.time} at ${appointmentDetails.location}`;
    }

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'normal',
    });
  }

  /**
   * Send RFQ notification
   */
  static async sendRFQNotification(
    phoneNumber: string,
    rfqDetails: {
      rfqNumber: string;
      title: string;
      deadline: Date;
      isIndigenous: boolean;
    }
  ): Promise<SMSResult> {
    let message = `New RFQ #${rfqDetails.rfqNumber}: ${rfqDetails.title}\n`;
    message += `Deadline: ${rfqDetails.deadline.toLocaleDateString('en-CA')}\n`;
    
    if (rfqDetails.isIndigenous) {
      message = this.INDIGENOUS_SMS_PREFIX + message;
      message += '\nIndigenous business opportunity';
    }

    message += '\nView details in the app';

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'high',
      isIndigenous: rfqDetails.isIndigenous,
    });
  }

  /**
   * Validate phone numbers
   */
  private static async validatePhoneNumbers(numbers: string[]): Promise<string[]> {
    const validated: string[] = [];

    for (const number of numbers) {
      try {
        // Format number for North America
        let formatted = number.replace(/\D/g, '');
        
        // Add country code if missing
        if (formatted.length === 10) {
          formatted = '+1' + formatted;
        } else if (!formatted.startsWith('+')) {
          formatted = '+' + formatted;
        }

        // Validate with Twilio
        const lookup = await this.twilioClient.lookups.v2
          .phoneNumbers(formatted)
          .fetch();

        if (lookup.valid) {
          validated.push(lookup.phoneNumber);
        }
      } catch (error) {
        logger.warn(`Invalid phone number: ${number}`);
      }
    }

    return validated;
  }

  /**
   * Format Indigenous message
   */
  private static formatIndigenousMessage(
    message: string,
    language?: string
  ): string {
    // Add cultural prefix
    let formatted = this.INDIGENOUS_SMS_PREFIX + message;

    // Add language-specific elements
    if (language) {
      const culturalNote = this.getCulturalNote(language);
      if (culturalNote) {
        formatted += `\n${culturalNote}`;
      }
    }

    return formatted;
  }

  /**
   * Get Indigenous greeting
   */
  private static getIndigenousGreeting(language: string): string {
    const greetings: Record<string, string> = {
      ojibwe: 'Boozhoo',
      cree: 'Tansi',
      inuktitut: 'ᐊᐃ',
      mikmaq: "Kwe'",
      mohawk: 'Shé:kon',
    };
    return greetings[language] || 'Hello';
  }

  /**
   * Get Indigenous closing
   */
  private static getIndigenousClosing(language: string): string {
    const closings: Record<string, string> = {
      ojibwe: 'Migwech',
      cree: 'Ekosi',
      inuktitut: 'Qujannamiik',
      mikmaq: "Wela'lin",
      mohawk: 'Niá:wen',
    };
    return closings[language] || 'Thank you';
  }

  /**
   * Get cultural note
   */
  private static getCulturalNote(language: string): string | null {
    const notes: Record<string, string> = {
      ojibwe: '🪶 Anishinaabe',
      cree: '🪶 Nêhiyaw',
      inuktitut: '🪶 ᐃᓄᐃᑦ',
      mikmaq: "🪶 L'nu",
      mohawk: '🪶 Kanienʼkehá꞉ka',
    };
    return notes[language] || null;
  }

  /**
   * Check rate limiting
   */
  private static async checkRateLimit(phoneNumber: string): Promise<void> {
    const key = `sms-rate:${phoneNumber}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    
    if (count > this.RATE_LIMIT_PER_MINUTE) {
      throw new Error('SMS rate limit exceeded');
    }
  }

  /**
   * Should retry SMS
   */
  private static shouldRetry(error: any): boolean {
    const retryableCodes = [
      20003, // Permission denied (temporary)
      20429, // Too many requests
      30001, // Queue overflow
      30002, // Account suspended (might be temporary)
      30003, // Unreachable destination
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Retry SMS
   */
  private static async retrySMS(
    options: SMSOptions
  ): Promise<SMSResult> {
    const attempt = (options.attempt || 0) + 1;
    
    if (attempt > this.MAX_RETRY_ATTEMPTS) {
      throw new Error('Max SMS retry attempts exceeded');
    }
    
    await new Promise(resolve => 
      setTimeout(resolve, this.RETRY_DELAY_MS * attempt)
    );
    
    return this.sendSMS({ ...options, attempt });
  }

  /**
   * Log SMS sent
   */
  private static async logSMSSent(
    options: SMSOptions,
    result: SMSResult
  ): Promise<void> {
    await prisma.smsLog.create({
      data: {
        messageId: result.messageId,
        to: result.to,
        message: options.message.substring(0, 160), // Store first 160 chars
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        price: result.price ? parseFloat(result.price) : null,
        priceUnit: result.priceUnit,
        isIndigenous: options.isIndigenous || false,
        language: options.language,
      },
    });
  }

  /**
   * Store notification history
   */
  private static async storeNotificationHistory(
    options: SMSOptions,
    result: SMSResult
  ): Promise<void> {
    await prisma.notificationHistory.create({
      data: {
        userId: result.to, // This would be mapped to actual user ID
        type: 'sms',
        channel: 'sms',
        subject: 'SMS Notification',
        content: options.message,
        metadata: {
          messageId: result.messageId,
          status: result.status,
          price: result.price,
          isIndigenous: options.isIndigenous,
        },
        status: result.errorCode ? 'failed' : 'sent',
      },
    });
  }

  /**
   * Get SMS status
   */
  static async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
    dateUpdated?: Date;
  }> {
    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      logger.error('Failed to get message status', error);
      throw error;
    }
  }

  /**
   * Get SMS delivery report
   */
  static async getDeliveryReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    totalCost: number;
  }> {
    try {
      const messages = await this.twilioClient.messages.list({
        dateSentAfter: startDate,
        dateSentBefore: endDate,
      });

      let sent = 0;
      let delivered = 0;
      let failed = 0;
      let totalCost = 0;

      for (const message of messages) {
        if (message.status === 'sent') sent++;
        else if (message.status === 'delivered') delivered++;
        else if (message.status === 'failed' || message.status === 'undelivered') failed++;
        
        if (message.price) {
          totalCost += Math.abs(parseFloat(message.price));
        }
      }

      return { sent, delivered, failed, totalCost };
    } catch (error) {
      logger.error('Failed to get delivery report', error);
      throw error;
    }
  }
}

export default SMSService;