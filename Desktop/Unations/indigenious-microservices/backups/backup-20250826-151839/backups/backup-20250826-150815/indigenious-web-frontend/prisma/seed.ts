import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'IT Services', description: 'Information Technology and Software Services' } }),
    prisma.category.create({ data: { name: 'Construction', description: 'Building and Infrastructure Construction' } }),
    prisma.category.create({ data: { name: 'Professional Services', description: 'Consulting and Professional Services' } }),
    prisma.category.create({ data: { name: 'Office Supplies', description: 'Office Equipment and Supplies' } }),
    prisma.category.create({ data: { name: 'Transportation', description: 'Transportation and Logistics Services' } }),
  ])

  // Create buyer user
  const buyerPassword = await bcrypt.hash('buyer123', 12)
  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@gov.ca',
      passwordHash: buyerPassword,
      name: 'Government Buyer',
      role: 'BUYER',
      verified: true,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Smith',
          phone: '613-555-0100',
          city: 'Ottawa',
          province: 'Ontario'
        }
      }
    }
  })

  // Create supplier users
  const supplierPassword = await bcrypt.hash('supplier123', 12)
  const supplier1 = await prisma.user.create({
    data: {
      email: 'supplier1@indigenous.ca',
      passwordHash: supplierPassword,
      name: 'Eagle Tech Solutions',
      role: 'SUPPLIER',
      verified: true,
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '416-555-0200',
          city: 'Toronto',
          province: 'Ontario'
        }
      },
      business: {
        create: {
          businessName: 'Eagle Tech Solutions',
          description: 'Indigenous-owned IT consulting and software development company',
          indigenousCertified: true,
          certificationNumber: 'CCAB-2024-001',
          certificationExpiry: new Date('2025-12-31'),
          verified: true,
          website: 'https://eagletech.ca',
          email: 'info@eagletech.ca',
          phone: '416-555-0201',
          address: '123 Tech Street',
          city: 'Toronto',
          province: 'Ontario',
          postalCode: 'M5V 3A8',
          employees: 25,
          yearEstablished: 2015,
          annualRevenue: 2500000
        }
      }
    },
    include: { business: true }
  })

  const supplier2 = await prisma.user.create({
    data: {
      email: 'supplier2@indigenous.ca',
      passwordHash: supplierPassword,
      name: 'Northern Construction Group',
      role: 'SUPPLIER',
      verified: true,
      profile: {
        create: {
          firstName: 'Michael',
          lastName: 'Bear',
          phone: '807-555-0300',
          city: 'Thunder Bay',
          province: 'Ontario'
        }
      },
      business: {
        create: {
          businessName: 'Northern Construction Group',
          description: 'Indigenous construction company specializing in sustainable building',
          indigenousCertified: true,
          certificationNumber: 'CCAB-2024-002',
          certificationExpiry: new Date('2025-12-31'),
          verified: true,
          website: 'https://northernconstruction.ca',
          email: 'info@northernconstruction.ca',
          phone: '807-555-0301',
          address: '456 Builder Ave',
          city: 'Thunder Bay',
          province: 'Ontario',
          postalCode: 'P7B 5E1',
          employees: 50,
          yearEstablished: 2010,
          annualRevenue: 5000000
        }
      }
    },
    include: { business: true }
  })

  // Add categories to businesses
  if (supplier1.business) {
    await prisma.businessCategory.create({
      data: {
        businessId: supplier1.business.id,
        categoryId: categories[0].id // IT Services
      }
    })
    await prisma.businessCategory.create({
      data: {
        businessId: supplier1.business.id,
        categoryId: categories[2].id // Professional Services
      }
    })
  }

  if (supplier2.business) {
    await prisma.businessCategory.create({
      data: {
        businessId: supplier2.business.id,
        categoryId: categories[1].id // Construction
      }
    })
  }

  // Create RFQs
  const rfq1 = await prisma.rFQ.create({
    data: {
      buyerId: buyer.id,
      title: 'Website Development for Indigenous Portal',
      description: 'Seeking proposals for the development of a comprehensive web portal to connect Indigenous communities with government services. The portal must be accessible, multilingual, and mobile-responsive.',
      requirements: 'WCAG 2.1 AA compliance, React/Next.js, PostgreSQL, French/English support',
      budgetMin: 50000,
      budgetMax: 150000,
      deadline: new Date('2025-03-31'),
      submissionDeadline: new Date('2025-02-15'),
      indigenousPreference: true,
      status: 'OPEN'
    }
  })

  const rfq2 = await prisma.rFQ.create({
    data: {
      buyerId: buyer.id,
      title: 'Community Center Construction Project',
      description: 'Construction of a new 5000 sq ft community center in Northern Ontario. Project includes design, permits, and full construction with emphasis on sustainable materials and traditional Indigenous architectural elements.',
      requirements: 'LEED certification, Indigenous design consultation, completion by Q4 2025',
      budgetMin: 500000,
      budgetMax: 750000,
      deadline: new Date('2025-12-31'),
      submissionDeadline: new Date('2025-02-28'),
      indigenousPreference: true,
      status: 'OPEN'
    }
  })

  const rfq3 = await prisma.rFQ.create({
    data: {
      buyerId: buyer.id,
      title: 'Annual Office Supplies Contract',
      description: 'Supply of office materials and equipment for government offices across the province. Looking for competitive pricing and reliable delivery services.',
      requirements: 'Monthly delivery, online ordering system, eco-friendly products preferred',
      budgetMin: 25000,
      budgetMax: 50000,
      deadline: new Date('2025-12-31'),
      submissionDeadline: new Date('2025-01-31'),
      indigenousPreference: false,
      status: 'OPEN'
    }
  })

  // Add categories to RFQs
  await prisma.rFQCategory.create({
    data: { rfqId: rfq1.id, categoryId: categories[0].id }
  })
  await prisma.rFQCategory.create({
    data: { rfqId: rfq2.id, categoryId: categories[1].id }
  })
  await prisma.rFQCategory.create({
    data: { rfqId: rfq3.id, categoryId: categories[3].id }
  })

  // Create sample bids
  if (supplier1.business) {
    await prisma.bid.create({
      data: {
        rfqId: rfq1.id,
        businessId: supplier1.business.id,
        userId: supplier1.id,
        proposal: 'Eagle Tech Solutions is pleased to submit our proposal for the Indigenous Portal development. With our extensive experience in government projects and deep understanding of Indigenous community needs, we are uniquely positioned to deliver this project successfully.',
        price: 125000,
        deliveryDate: new Date('2025-03-15'),
        validUntil: new Date('2025-03-01'),
        status: 'SUBMITTED'
      }
    })
  }

  if (supplier2.business) {
    await prisma.bid.create({
      data: {
        rfqId: rfq2.id,
        businessId: supplier2.business.id,
        userId: supplier2.id,
        proposal: 'Northern Construction Group brings 15 years of experience in sustainable construction with a focus on Indigenous architectural principles. Our team includes Indigenous designers and we have completed similar projects across Northern Ontario.',
        price: 675000,
        deliveryDate: new Date('2025-11-30'),
        validUntil: new Date('2025-03-15'),
        status: 'SUBMITTED'
      }
    })
  }

  console.log('Seed completed successfully!')
  console.log('Created users:')
  console.log('  - buyer@gov.ca (password: buyer123)')
  console.log('  - supplier1@indigenous.ca (password: supplier123)')
  console.log('  - supplier2@indigenous.ca (password: supplier123)')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })