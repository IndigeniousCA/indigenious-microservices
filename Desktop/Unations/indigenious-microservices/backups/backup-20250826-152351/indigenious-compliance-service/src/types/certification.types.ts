export enum CertificationType {
  INDIGENOUS_BUSINESS = 'INDIGENOUS_BUSINESS',
  MINORITY_OWNED = 'MINORITY_OWNED',
  WOMEN_OWNED = 'WOMEN_OWNED',
  VETERAN_OWNED = 'VETERAN_OWNED',
  DISABILITY_OWNED = 'DISABILITY_OWNED',
  LGBTQ_OWNED = 'LGBTQ_OWNED',
  GENERAL = 'GENERAL',
}

export enum CertificationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED',
}

export interface Certification {
  id: string;
  certificationNumber: string;
  businessId: string;
  businessName: string;
  businessNumber: string;
  type: CertificationType;
  status: CertificationStatus;
  issuedBy: string;
  validFrom: Date;
  validUntil: Date;
  metadata?: {
    bandNumber?: string;
    bandName?: string;
    region?: string;
    indigenousGroup?: string;
    ownership?: number;
    ccabNumber?: string;
    [key: string]: any;
  };
  supportingDocuments: string[];
  lastRenewalDate?: Date;
  renewalCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateCertificationData {
  businessId: string;
  businessName: string;
  businessNumber: string;
  type: CertificationType;
  issuedBy: string;
  bandNumber?: string;
  bandName?: string;
  region?: string;
  indigenousGroup?: string;
  ownershipPercentage?: number;
  supportingDocuments: string[];
}

export interface UpdateCertificationData {
  status?: CertificationStatus;
  validUntil?: Date;
  metadata?: Record<string, any>;
  revocationReason?: string;
}

export interface VerificationResult {
  valid: boolean;
  certificationNumber: string;
  message?: string;
  businessName?: string;
  type?: CertificationType;
  issuedOn?: Date;
  expiresOn?: Date;
  expiredOn?: Date;
  revokedOn?: Date;
  issuedBy?: string;
  metadata?: Record<string, any>;
}