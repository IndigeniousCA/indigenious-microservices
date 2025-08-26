# Business Registration Feature

## Overview
Progressive registration wizard for Indigenous businesses to join the platform. Collects all critical data while maintaining a smooth UX.

## 🎯 Purpose
- Gather business information, Indigenous verification, and workforce capabilities
- Progressive disclosure pattern to avoid overwhelming users
- Strict verification for non-Indigenous businesses (permanent ban if lying)

## 📁 Structure
```
business-registration/
├── components/
│   ├── RegistrationWizard.tsx    # Main wizard container
│   ├── BasicInfoStep.tsx         # Business name, contact info
│   ├── IndigenousVerificationStep.tsx  # Community affiliation, ownership %
│   ├── CapabilitiesStep.tsx      # Industries, certifications, workforce
│   └── ReviewStep.tsx            # Final review before submission
├── hooks/
│   └── useRegistration.ts        # Registration state management
├── services/
│   └── registration.service.ts   # API calls for registration
├── types/
│   └── registration.types.ts     # TypeScript interfaces
└── tests/
    └── registration.test.tsx     # Component tests
```

## 🔧 Usage

### Basic Implementation
```tsx
import { RegistrationWizard } from '@/features/business-registration'

export default function RegisterPage() {
  const handleComplete = (businessData) => {
    // Navigate to dashboard or verification pending page
    router.push('/dashboard')
  }

  return (
    <RegistrationWizard 
      onComplete={handleComplete}
      initialData={savedDraft} // Optional: resume from draft
    />
  )
}
```

### Custom Step Order
```tsx
<RegistrationWizard 
  steps={['basic', 'capabilities', 'indigenous', 'review']} // Custom order
  skipSteps={['indigenous']} // For non-Indigenous businesses
/>
```

## 📊 Data Collected

### Step 1: Basic Information
- Business name
- Business number (optional)
- Email
- Phone
- Website

### Step 2: Indigenous Verification
- Indigenous ownership percentage (0-100%)
- Primary Nation/Community
- Territory/Treaty area
- Band number (optional)
- Verification documents upload

### Step 3: Capabilities & Workforce
- Industries served (multi-select)
- Total workforce size
- Number of Indigenous employees
- Certifications (ISO, COR, etc.)
- Certified trades breakdown

### Step 4: Review & Submit
- Summary of all information
- Terms acceptance
- Submit for verification

## 🔐 Validation Rules

- Email: Valid email format
- Business number: Canadian format (123456789RC0001)
- Phone: 10+ digits
- Indigenous ownership: 51%+ for "Indigenous-owned" status
- At least one industry must be selected

## 🎨 Glassmorphism UI Components

All components use the glass UI design system:
- `GlassPanel` - Semi-transparent containers
- `GlassButton` - Buttons with blur effect
- `GlassInput` - Input fields with transparency

## 📡 API Integration

### Create Business
```typescript
POST /api/businesses
{
  businessName: string
  email: string
  indigenousOwnershipPercentage: number
  communityAffiliation: {
    primaryNation: string
    territory: string
  }
  // ... other fields
}
```

### Upload Verification Documents
```typescript
POST /api/businesses/:id/documents
FormData with files
```

## 🧪 Testing

Run tests:
```bash
npm test business-registration
```

Key test scenarios:
- Form validation
- Step navigation
- Data persistence between steps
- Error handling
- Document upload

## 🚀 Future Enhancements

1. **Auto-save drafts** - Save progress automatically
2. **Bulk registration** - Upload CSV for multiple businesses
3. **AI verification** - Auto-verify using government APIs
4. **Mobile optimization** - Better touch targets
5. **Multi-language** - French, Cree, Ojibwe support

## 💡 Best Practices

1. Always validate on both client and server
2. Show clear error messages
3. Allow users to go back and edit
4. Save drafts to prevent data loss
5. Provide help tooltips for complex fields

## 🐛 Known Issues

- File upload can be slow on poor connections
- Some treaty territories not in dropdown (use "Other")
- Business number validation needs update for new format

## 📚 Related Documentation

- [Business Directory Feature](../business-directory/README.md)
- [Verification Process](../../docs/verification-process.md)
- [Data Provider API](../../core/providers/README.md)