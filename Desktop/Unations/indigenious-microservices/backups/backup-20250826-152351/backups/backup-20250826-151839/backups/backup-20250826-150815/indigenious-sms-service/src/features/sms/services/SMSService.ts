export class SMSService {
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    console.log('SMS service placeholder:', { phoneNumber, message });
    // TODO: Implement actual SMS sending
  }
  
  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<void> {
    await Promise.all(phoneNumbers.map(phone => this.sendSMS(phone, message)));
  }
}