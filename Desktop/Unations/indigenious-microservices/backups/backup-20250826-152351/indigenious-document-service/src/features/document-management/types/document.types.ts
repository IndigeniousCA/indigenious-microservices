// TypeScript types for document-management

export interface Document {
  id: string
  title: string
  description?: string
  fileName: string
  fileType: string
  fileSize: number
  mimeType: string
  url: string
  thumbnailUrl?: string
  
  // Metadata
  category: DocumentCategory
  tags: string[]
  projectId?: string
  rfqId?: string
  
  // Version control
  version: number
  isLatest: boolean
  previousVersionId?: string
  
  // Upload info
  uploadedBy: string
  uploadedByName: string
  uploadedAt: string
  
  // Status
  status: DocumentStatus
  processingStatus?: ProcessingStatus
  
  // Permissions
  accessLevel: AccessLevel
  sharedWith: string[]
  
  // Analytics
  viewCount: number
  downloadCount: number
  lastViewedAt?: string
}

export type DocumentCategory = 
  | 'blueprint'
  | 'specification'
  | 'contract'
  | 'report'
  | 'certificate'
  | 'photo'
  | 'other'

export type DocumentStatus = 
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error'
  | 'archived'

export type ProcessingStatus = 
  | 'converting'
  | 'generating-thumbnail'
  | 'extracting-text'
  | 'scanning'

export type AccessLevel = 
  | 'public'
  | 'private'
  | 'restricted'
  | 'confidential'

export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  fileName: string
  fileSize: number
  changes?: string
  uploadedBy: string
  uploadedAt: string
  url: string
}

export interface Annotation {
  id: string
  documentId: string
  pageNumber?: number
  type: AnnotationType
  coordinates: {
    x: number
    y: number
    width?: number
    height?: number
  }
  content: string
  color?: string
  
  createdBy: string
  createdByName: string
  createdAt: string
  
  replies?: AnnotationReply[]
  resolved: boolean
}

export type AnnotationType = 
  | 'comment'
  | 'highlight'
  | 'rectangle'
  | 'arrow'
  | 'measurement'
  | 'text'

export interface AnnotationReply {
  id: string
  content: string
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface UploadProgress {
  fileName: string
  fileSize: number
  uploadedBytes: number
  percentage: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  startTime: number
  estimatedTimeRemaining?: number
}

export interface DocumentFilters {
  search?: string
  category?: DocumentCategory
  tags?: string[]
  projectId?: string
  rfqId?: string
  uploadedBy?: string
  dateRange?: {
    start: string
    end: string
  }
  fileTypes?: string[]
  status?: DocumentStatus
}

export interface ViewerState {
  documentId: string
  currentPage: number
  totalPages: number
  zoom: number
  rotation: number
  fitMode: 'width' | 'height' | 'page'
  annotations: Annotation[]
  showAnnotations: boolean
  showThumbnails: boolean
  showLayers?: boolean
  selectedTool?: AnnotationType
}

// CAD-specific types
export interface CADDocument extends Document {
  layers?: CADLayer[]
  sheets?: CADSheet[]
  units: 'metric' | 'imperial'
  scale?: string
}

export interface CADLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  color?: string
}

export interface CADSheet {
  id: string
  name: string
  number: string
  size: string // A1, A2, etc.
}