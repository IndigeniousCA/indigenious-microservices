export interface Badge {
  id: string;
  businessId: string;
  identity: BadgeIdentity;
  visual: VisualBadge;
  status: BadgeStatus;
  createdAt: Date;
  updatedAt: Date;
  lastVerified: Date;
  clickCount: number;
  conversionCount: number;
  platforms: BadgePlatform[];
}

export interface BadgeIdentity {
  publicKey: string;
  temporalProof: string;
  indigenousHash: string;
  performanceSignature: string;
  blockchainAnchor: string;
}

export interface VisualBadge {
  animal: AnimalSpirit;
  stage: BadgeStage;
  metrics: ImpactMetrics;
  animations: BadgeAnimations;
  colors: BadgeColors;
}

export interface BadgeAnimations {
  idle: string;
  hover: string;
  click: string;
  evolution: string;
}

export interface BadgeColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export interface ImpactMetrics {
  procurementPercentage: number;
  indigenousEmployment: number;
  communityInvestment: number;
  sustainabilityScore: number;
  yearsActive: number;
  totalImpactValue: number;
}

export enum AnimalSpirit {
  BEAVER = 'beaver',
  EAGLE = 'eagle',
  FOX = 'fox',
  WOLF = 'wolf',
  BEAR = 'bear',
  TURTLE = 'turtle',
  OTTER = 'otter',
  WOLVERINE = 'wolverine',
  MARTEN = 'marten',
  RAVEN = 'raven'
}

export enum BadgeStage {
  ENTRY = 1,
  AURORA = 2,
  GOLDEN = 3,
  LEGENDARY = 4
}

export enum BadgeStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

export interface BadgePlatform {
  platform: Platform;
  embedCode: string;
  isActive: boolean;
  lastSynced: Date;
  analytics: PlatformAnalytics;
}

export enum Platform {
  WEBSITE = 'website',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  EMAIL = 'email',
  MOBILE_IOS = 'mobile_ios',
  MOBILE_ANDROID = 'mobile_android'
}

export interface PlatformAnalytics {
  impressions: number;
  clicks: number;
  conversions: number;
  lastActivity: Date;
}

export interface BadgeEmbedOptions {
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark';
  showMetrics: boolean;
  showAnimation: boolean;
  clickable: boolean;
  trackingEnabled: boolean;
}

export interface BadgeVerificationRequest {
  publicKey: string;
  temporalProof: string;
  blockchainAnchor: string;
}

export interface BadgeVerificationResponse {
  isValid: boolean;
  business?: {
    id: string;
    name: string;
    indigenousPartnership: {
      communityName: string;
      partnershipType: string;
    };
  };
  badge?: Badge;
  verificationTimestamp: Date;
}