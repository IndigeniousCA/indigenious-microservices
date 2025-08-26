# RFQ System Feature

## Overview
Dual-purpose Request for Quotation (RFQ) system serving both government departments seeking Indigenous suppliers and band councils posting community infrastructure projects.

## 🎯 Purpose
- Help government meet 5% Indigenous procurement targets
- Enable band councils to post local construction/service projects
- Facilitate transparent bidding process
- Track compliance and reporting

## 📁 Structure
```
rfq-system/
├── components/
│   ├── RFQSystem.tsx          # Main RFQ container
│   ├── RFQCreationForm.tsx    # Multi-step creation wizard
│   ├── RFQMarketplace.tsx     # Browse active RFQs
│   ├── BidSubmission.tsx      # Submit bids interface
│   ├── BidEvaluation.tsx      # Evaluate submitted bids
│   └── RFQDetail.tsx          # Single RFQ view
├── hooks/
│   ├── useRFQ.ts             # RFQ state management
│   └── usePermissions.ts      # User permissions check
├── services/
│   └── rfq.service.ts        # RFQ API calls
├── types/
│   └── rfq.types.ts          # TypeScript interfaces
└── tests/
    └── rfq.test.tsx          # Component tests
```

## 🔧 Usage

### Create Government RFQ (5% Target)
```tsx
import { RFQCreationForm } from '@/features/rfq-system'

export function CreateGovernmentRFQ() {
  return (
    <RFQCreationForm 
      rfqType="government"
      organization="Indigenous Services Canada"
      onComplete={(rfq) => {
        // RFQ posted to Indigenous suppliers only
        router.push(`/rfq/${rfq.id}`)
      }}
    />
  )
}
```

### Create Band Council RFQ
```tsx
import { RFQCreationForm } from '@/features/rfq-system'

export function CreateBandRFQ() {
  return (
    <RFQCreationForm 
      rfqType="band"
      organization="Six Nations Council"
      metadata={{
        remoteLocation: true,
        winterRoadOnly: true
      }}
      onComplete={(rfq) => {
        // RFQ open to all suppliers
        router.push(`/rfq/${rfq.id}`)
      }}
    />
  )
}
```

## 🏛️ RFQ Types

### Government RFQs
**Purpose**: Meet 5% Indigenous procurement target
- Only visible to verified Indigenous businesses
- Minimum Indigenous content percentage (5-100%)
- Automatic matching with Indigenous suppliers
- Federal/Provincial compliance tracking

**Example Use Cases**:
- IT support services
- Professional consulting
- Office supplies
- Vehicle fleet management

### Band Council RFQs
**Purpose**: Community infrastructure & services
- Open to all suppliers (Indigenous preferred)
- Local benefit requirements
- Cultural considerations
- Remote location challenges

**Example Use Cases**:
- Community centre construction
- Road paving projects
- Water treatment upgrades
- Housing developments

## 📋 Creation Workflow

### Step 1: Project Details
- Title and description
- Category selection
- Type indicator (Government/Band)

### Step 2: Requirements
**Government RFQs**:
- Indigenous ownership percentage
- Acceptable business types
- Mandatory certifications

**Band RFQs**:
- Local employment requirements
- Youth training positions
- Cultural requirements
- Sacred site considerations

### Step 3: Budget & Timeline
- Budget range
- Submission deadline
- Project start/end dates
- Payment terms

### Step 4: Location & Logistics
- Project location
- Site visit requirements
- Remote access considerations
- Material delivery challenges

### Step 5: Evaluation Criteria
- Price weight (%)
- Experience weight (%)
- Indigenous participation (%)
- Local benefit (%)
- Sustainability (%)

### Step 6: Documents & Review
- Upload specifications
- Attach blueprints
- Add terms & conditions
- Final review

## 🏢 Marketplace Features

### Filters
- RFQ type (Government/Band)
- Category
- Budget range
- Location
- Deadline
- Indigenous content %

### RFQ Cards Display
- Type badge (Government/Band)
- Budget range
- Days remaining
- Bid count
- Indigenous requirement
- Quick preview

### Smart Matching
- AI suggests relevant RFQs
- Based on business capabilities
- Past performance considered
- Certification matching

## 📊 Evaluation System

### Scoring Matrix
```typescript
{
  price: 40,           // Cost competitiveness
  experience: 20,      // Past performance
  indigenous: 20,      // Indigenous participation
  localBenefit: 10,    // Community impact
  sustainability: 10   // Environmental considerations
}
```

### Evaluation Features
- Blind evaluation mode
- Multi-evaluator consensus
- Automated scoring
- Conflict resolution
- Audit trail

## 🔐 Permissions

### Who Can Create RFQs
- Government departments (verified)
- Band councils (verified)
- Crown corporations
- Indigenous organizations

### Who Can View/Bid
- **Government RFQs**: Verified Indigenous businesses only
- **Band RFQs**: All registered suppliers
- Must accept terms to view details

## 📡 API Integration

### Create RFQ
```typescript
POST /api/rfqs
{
  type: 'government' | 'band'
  title: string
  category: string
  requirements: Requirements
  budget: BudgetRange
  evaluationCriteria: Criteria
}
```

### Submit Bid
```typescript
POST /api/rfqs/:id/bids
{
  price: number
  timeline: string
  approach: string
  team: TeamMember[]
  attachments: File[]
}
```

## 🧪 Testing

Run tests:
```bash
npm test rfq-system
```

Key test scenarios:
- RFQ creation flow
- Permission checks
- Bid submission
- Evaluation scoring
- Deadline enforcement

## 🚀 Future Enhancements

1. **Template Library** - Pre-built RFQ templates
2. **Bulk Operations** - Create multiple similar RFQs
3. **Advanced Analytics** - Success rate tracking
4. **Auto-matching** - AI-powered supplier suggestions
5. **Integration** - Connect with government systems

## 💡 Best Practices

1. Provide clear, detailed descriptions
2. Set realistic timelines
3. Include all evaluation criteria upfront
4. Respond to bidder questions promptly
5. Document selection rationale

## 🐛 Known Issues

- Large attachment uploads can timeout
- Evaluation criteria must total 100%
- Calendar integration pending

## 📚 Related Documentation

- [Business Directory](../business-directory/README.md)
- [Chat System](../chat/README.md)
- [Bid Submission Guide](../../docs/guides/bidding.md)