import { faker } from '@faker-js/faker/locale/en_CA';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test data generators for payment scenarios
 * Includes Indigenous business scenarios and Canadian payment patterns
 */

export class PaymentDataGenerator {
  // Canadian provinces and territories
  private static readonly PROVINCES = [
    'ON', 'BC', 'AB', 'QC', 'NS', 'NB', 'MB', 'PE', 'SK', 'NL', 'NT', 'YT', 'NU'
  ];

  // First Nations bands (sample)
  private static readonly FIRST_NATIONS = [
    { name: 'Six Nations of the Grand River', bandNumber: '1', province: 'ON' },
    { name: 'Mohawk Council of Kahnawà:ke', bandNumber: '70', province: 'QC' },
    { name: 'Musqueam Indian Band', bandNumber: '550', province: 'BC' },
    { name: 'Siksika Nation', bandNumber: '430', province: 'AB' },
    { name: 'Peguis First Nation', bandNumber: '268', province: 'MB' },
    { name: 'Membertou First Nation', bandNumber: '26', province: 'NS' },
    { name: 'Yellowknives Dene First Nation', bandNumber: '754', province: 'NT' },
  ];

  // Indigenous business types
  private static readonly BUSINESS_TYPES = [
    'Construction', 'Consulting', 'Technology', 'Manufacturing', 
    'Tourism', 'Arts & Crafts', 'Natural Resources', 'Transportation'
  ];

  /**
   * Generate a mock Indigenous business
   */
  static generateIndigenousBusiness() {
    const nation = faker.helpers.arrayElement(this.FIRST_NATIONS);
    const isOnReserve = faker.datatype.boolean();
    
    return {
      id: uuidv4(),
      name: `${nation.name} ${faker.helpers.arrayElement(this.BUSINESS_TYPES)} Ltd.`,
      email: faker.internet.email({ provider: 'indigenous.ca' }),
      phone: faker.phone.number('###-###-####'),
      address: isOnReserve 
        ? `${faker.location.streetAddress()}, ${nation.name} Reserve`
        : faker.location.streetAddress(true),
      province: nation.province,
      bandNumber: nation.bandNumber,
      businessNumber: `${faker.number.int({ min: 100000000, max: 999999999 })}RC0001`,
      taxExemptNumber: isOnReserve ? `EXEMPT-${faker.number.int({ min: 10000, max: 99999 })}` : null,
      isIndigenous: true,
      isVerified: faker.datatype.boolean({ probability: 0.8 }),
      isOnReserve,
      employeeCount: faker.number.int({ min: 1, max: 500 }),
      indigenousEmployeePercentage: faker.number.int({ min: 51, max: 100 }),
      yearEstablished: faker.date.past({ years: 30 }).getFullYear(),
      certifications: faker.helpers.arrayElements([
        'CCAB Certified',
        'ISO 9001',
        'ISO 14001',
        'CAMSC Certified',
        'Supply Nation Certified',
      ], { min: 0, max: 3 }),
    };
  }

  /**
   * Generate a payment request
   */
  static generatePaymentRequest(businessId?: string, isIndigenous = true) {
    const amount = faker.number.float({ min: 10, max: 50000, fractionDigits: 2 });
    const province = faker.helpers.arrayElement(this.PROVINCES);
    
    return {
      amount,
      currency: 'CAD',
      provider: faker.helpers.arrayElement(['stripe', 'interac', 'paypal']),
      businessId: businessId || uuidv4(),
      metadata: {
        invoiceNumber: `INV-${faker.date.recent().getFullYear()}-${faker.number.int({ min: 1000, max: 9999 })}`,
        contractNumber: `CON-${faker.number.int({ min: 100000, max: 999999 })}`,
        province,
        isIndigenous,
        description: faker.commerce.productDescription(),
        purchaseOrderNumber: `PO-${faker.number.int({ min: 10000, max: 99999 })}`,
      },
    };
  }

  /**
   * Generate a government contract for quick pay
   */
  static generateGovernmentContract() {
    const contractValue = faker.number.float({ min: 10000, max: 5000000, fractionDigits: 2 });
    
    return {
      id: uuidv4(),
      contractNumber: `${faker.number.int({ min: 1000, max: 9999 })}-${faker.number.int({ min: 100000, max: 999999 })}`,
      title: faker.company.catchPhrase(),
      value: contractValue,
      status: 'ACTIVE',
      startDate: faker.date.recent({ days: 30 }),
      endDate: faker.date.future({ years: 2 }),
      rfq: {
        id: uuidv4(),
        referenceNumber: `RFQ-${faker.date.recent().getFullYear()}-${faker.number.int({ min: 10000, max: 99999 })}`,
        title: faker.company.buzzPhrase(),
        issuingOrganization: {
          id: uuidv4(),
          name: faker.helpers.arrayElement([
            'Public Services and Procurement Canada',
            'Indigenous Services Canada',
            'Crown-Indigenous Relations',
            'Parks Canada',
            'Department of National Defence',
            'Transport Canada',
          ]),
          type: 'GOVERNMENT',
        },
        province: faker.helpers.arrayElement(this.PROVINCES),
        setAsideForIndigenous: faker.datatype.boolean({ probability: 0.3 }),
      },
      milestones: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        id: uuidv4(),
        description: faker.lorem.sentence(),
        amount: contractValue / faker.number.int({ min: 3, max: 10 }),
        dueDate: faker.date.future({ years: 1 }),
        status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
      })),
    };
  }

  /**
   * Generate Interac e-Transfer data
   */
  static generateInteracTransfer() {
    const business = this.generateIndigenousBusiness();
    
    return {
      amount: faker.number.float({ min: 0.01, max: 25000, fractionDigits: 2 }),
      email: business.email,
      phone: business.phone,
      businessName: business.name,
      securityQuestion: faker.helpers.arrayElement([
        'What is your band number?',
        'What is your business registration number?',
        'What year was your business established?',
        'What is your primary service?',
        'What is the contract reference number?',
      ]),
      securityAnswer: faker.word.noun(),
      language: faker.helpers.arrayElement(['en', 'fr']),
      sendSms: faker.datatype.boolean(),
      invoiceNumber: `INV-${faker.number.int({ min: 10000, max: 99999 })}`,
      memo: faker.lorem.sentence(),
    };
  }

  /**
   * Generate bulk payment data
   */
  static generateBulkPayments(count = 10) {
    const payments = [];
    
    for (let i = 0; i < count; i++) {
      const business = this.generateIndigenousBusiness();
      payments.push({
        businessId: business.id,
        businessName: business.name,
        email: business.email,
        amount: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
        invoiceNumber: `INV-BULK-${faker.number.int({ min: 1000, max: 9999 })}`,
        description: `Payment for ${faker.commerce.product()}`,
      });
    }
    
    return payments;
  }

  /**
   * Generate tax calculation scenarios
   */
  static generateTaxScenarios() {
    return this.PROVINCES.map(province => {
      const business = this.generateIndigenousBusiness();
      business.province = province;
      
      return {
        province,
        scenarios: [
          {
            name: 'Regular taxable sale',
            amount: 100,
            businessId: uuidv4(),
            isIndigenous: false,
            expectedTaxExempt: false,
          },
          {
            name: 'Indigenous on-reserve',
            amount: 100,
            businessId: business.id,
            business: { ...business, isOnReserve: true },
            isIndigenous: true,
            expectedTaxExempt: true,
          },
          {
            name: 'Indigenous with tax exempt certificate',
            amount: 100,
            businessId: business.id,
            business: { ...business, taxExemptStatus: 'APPROVED' },
            isIndigenous: true,
            expectedTaxExempt: true,
          },
          {
            name: 'Large amount',
            amount: 999999.99,
            businessId: uuidv4(),
            isIndigenous: false,
            expectedTaxExempt: false,
          },
          {
            name: 'Small amount',
            amount: 0.01,
            businessId: uuidv4(),
            isIndigenous: false,
            expectedTaxExempt: false,
          },
        ],
      };
    });
  }

  /**
   * Generate refund scenarios
   */
  static generateRefundScenarios() {
    return [
      {
        name: 'Full refund',
        originalAmount: 100,
        refundAmount: 100,
        reason: 'requested_by_customer',
      },
      {
        name: 'Partial refund',
        originalAmount: 100,
        refundAmount: 50,
        reason: 'partial_return',
      },
      {
        name: 'Defective product refund',
        originalAmount: 500,
        refundAmount: 500,
        reason: 'defective_product',
      },
      {
        name: 'Contract cancellation',
        originalAmount: 10000,
        refundAmount: 10000,
        reason: 'contract_cancelled',
      },
    ];
  }

  /**
   * Generate subscription scenarios
   */
  static generateSubscriptionScenarios() {
    return [
      {
        name: 'Indigenous SME (Free)',
        planId: 'INDIGENOUS_SME',
        customerId: uuidv4(),
        metadata: {
          businessType: 'Indigenous SME',
          employeeCount: faker.number.int({ min: 1, max: 50 }),
          isIndigenous: true,
        },
      },
      {
        name: 'Large Indigenous Organization',
        planId: 'LARGE_INDIGENOUS',
        customerId: uuidv4(),
        metadata: {
          businessType: 'Large Indigenous',
          employeeCount: faker.number.int({ min: 100, max: 1000 }),
          isIndigenous: true,
        },
      },
      {
        name: 'Canadian Business',
        planId: 'CANADIAN_BUSINESS',
        customerId: uuidv4(),
        metadata: {
          businessType: 'Canadian',
          employeeCount: faker.number.int({ min: 10, max: 500 }),
          isIndigenous: false,
        },
      },
      {
        name: 'Government License',
        planId: 'GOVERNMENT_LICENSE',
        customerId: uuidv4(),
        metadata: {
          organizationType: 'Government',
          department: faker.helpers.arrayElement([
            'PSPC', 'ISC', 'DND', 'TC', 'PC'
          ]),
        },
      },
    ];
  }

  /**
   * Generate quick pay scenarios
   */
  static generateQuickPayScenarios() {
    const contract = this.generateGovernmentContract();
    const business = this.generateIndigenousBusiness();
    
    return [
      {
        name: 'Small milestone payment',
        contractId: contract.id,
        businessId: business.id,
        amount: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
        invoiceNumber: `QP-${faker.number.int({ min: 1000, max: 9999 })}`,
        expectedProcessingTime: 24, // hours
      },
      {
        name: 'Large contract payment',
        contractId: contract.id,
        businessId: business.id,
        amount: faker.number.float({ min: 100000, max: 500000, fractionDigits: 2 }),
        invoiceNumber: `QP-${faker.number.int({ min: 10000, max: 99999 })}`,
        expectedProcessingTime: 24,
      },
      {
        name: 'Emergency payment',
        contractId: contract.id,
        businessId: business.id,
        amount: faker.number.float({ min: 5000, max: 25000, fractionDigits: 2 }),
        invoiceNumber: `QP-EMRG-${faker.number.int({ min: 100, max: 999 })}`,
        priority: 'HIGH',
        expectedProcessingTime: 12,
      },
    ];
  }

  /**
   * Generate webhook event data
   */
  static generateWebhookEvent(provider: 'stripe' | 'interac' | 'paypal') {
    const baseEvent = {
      id: `evt_${uuidv4()}`,
      created: Math.floor(Date.now() / 1000),
    };

    switch (provider) {
      case 'stripe':
        return {
          ...baseEvent,
          type: faker.helpers.arrayElement([
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'customer.subscription.created',
            'customer.subscription.deleted',
            'charge.refunded',
          ]),
          data: {
            object: {
              id: `pi_${faker.string.alphanumeric(16)}`,
              amount: faker.number.int({ min: 100, max: 100000 }),
              currency: 'cad',
              status: faker.helpers.arrayElement(['succeeded', 'failed', 'processing']),
            },
          },
        };

      case 'interac':
        return {
          ...baseEvent,
          type: faker.helpers.arrayElement([
            'transfer.completed',
            'transfer.cancelled',
            'transfer.expired',
            'request.fulfilled',
          ]),
          data: {
            transferId: `INT-${Date.now()}-${faker.string.alphanumeric(8)}`,
            status: faker.helpers.arrayElement(['COMPLETED', 'CANCELLED', 'EXPIRED']),
            amount: faker.number.float({ min: 0.01, max: 25000, fractionDigits: 2 }),
          },
        };

      default:
        return baseEvent;
    }
  }

  /**
   * Generate payment history
   */
  static generatePaymentHistory(businessId: string, count = 20) {
    const history = [];
    const startDate = faker.date.past({ years: 2 });
    
    for (let i = 0; i < count; i++) {
      const createdAt = faker.date.between({ from: startDate, to: new Date() });
      const status = faker.helpers.arrayElement(['completed', 'failed', 'refunded', 'pending']);
      
      history.push({
        id: uuidv4(),
        businessId,
        amount: faker.number.float({ min: 10, max: 50000, fractionDigits: 2 }),
        currency: 'CAD',
        status,
        provider: faker.helpers.arrayElement(['stripe', 'interac', 'paypal']),
        createdAt,
        completedAt: status === 'completed' ? faker.date.soon({ days: 2, refDate: createdAt }) : null,
        invoiceNumber: `INV-${createdAt.getFullYear()}-${faker.number.int({ min: 1000, max: 9999 })}`,
        taxAmount: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      });
    }
    
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export default PaymentDataGenerator;