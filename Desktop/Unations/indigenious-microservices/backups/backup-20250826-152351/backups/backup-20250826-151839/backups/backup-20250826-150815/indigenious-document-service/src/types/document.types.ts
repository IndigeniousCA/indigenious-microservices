export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  ARCHIVED = 'archived',
  QUARANTINED = 'quarantined',
}

export enum DocumentCategory {
  BLUEPRINT = 'blueprint',
  SPECIFICATION = 'specification',
  CONTRACT = 'contract',
  REPORT = 'report',
  CERTIFICATE = 'certificate',
  PHOTO = 'photo',
  CAD = 'cad',
  VERIFICATION = 'verification',
  INVOICE = 'invoice',
  OTHER = 'other',
}

export enum AccessLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
  CONFIDENTIAL = 'confidential',
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  url: string;
  thumbnailUrl?: string;
  
  category: DocumentCategory;
  tags: string[];
  projectId?: string;
  rfqId?: string;
  businessId: string;
  
  version: number;
  isLatest: boolean;
  previousVersionId?: string;
  
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt?: Date;
  
  status: DocumentStatus;
  accessLevel: AccessLevel;
  sharedWith: string[];
  
  viewCount: number;
  downloadCount: number;
  lastViewedAt?: Date;
  
  metadata?: Record<string, any>;
  extractedText?: string;
  ocrProcessed?: boolean;
  virusScanStatus?: 'pending' | 'clean' | 'infected' | 'error';
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  s3Key: string;
  fileName: string;
  fileSize: number;
  changes?: string;
  uploadedBy: string;
  uploadedAt: Date;
  isLatest: boolean;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWith: string; // userId or email
  sharedBy: string;
  sharedAt: Date;
  expiresAt?: Date;
  permissions: SharePermission[];
  accessLink?: string;
}

export enum SharePermission {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
}

export interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  startTime: number;
  estimatedTimeRemaining?: number;
}