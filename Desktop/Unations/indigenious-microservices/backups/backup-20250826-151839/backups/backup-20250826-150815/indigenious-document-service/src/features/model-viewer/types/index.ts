// 3D Model Viewer Types

export interface Model3D {
  id: string
  name: string
  description?: string
  fileUrl: string
  thumbnailUrl?: string
  format: '3dm' | 'dwg' | 'dxf' | 'fbx' | 'glb' | 'gltf' | 'ifc' | 'obj' | 'ply' | 'stl' | 'step'
  fileSize: number
  uploadDate: Date
  uploadedBy: string
  projectId?: string
  tags: string[]
  metadata: ModelMetadata
  annotations: Annotation[]
  viewSettings?: ViewSettings
  permissions: ModelPermissions
}

export interface ModelMetadata {
  dimensions?: {
    x: number
    y: number
    z: number
    unit: 'mm' | 'cm' | 'm' | 'ft' | 'in'
  }
  vertexCount?: number
  faceCount?: number
  materialCount?: number
  hasTextures: boolean
  hasAnimations: boolean
  bounds?: {
    min: { x: number, y: number, z: number }
    max: { x: number, y: number, z: number }
  }
  origin?: { x: number, y: number, z: number }
  scale?: number
}

export interface Annotation {
  id: string
  userId: string
  userName: string
  timestamp: Date
  position: { x: number, y: number, z: number }
  cameraPosition?: { x: number, y: number, z: number }
  cameraTarget?: { x: number, y: number, z: number }
  type: 'note' | 'issue' | 'measurement' | 'markup'
  content: string
  attachments?: string[]
  status?: 'open' | 'resolved' | 'closed'
  priority?: 'low' | 'medium' | 'high'
  color?: string
  replies?: AnnotationReply[]
}

export interface AnnotationReply {
  id: string
  userId: string
  userName: string
  timestamp: Date
  content: string
}

export interface ViewSettings {
  backgroundColor: string
  ambientLight: number
  directionalLight: number
  shadowsEnabled: boolean
  gridEnabled: boolean
  axisHelperEnabled: boolean
  defaultCameraPosition?: { x: number, y: number, z: number }
  defaultCameraTarget?: { x: number, y: number, z: number }
  defaultZoom?: number
  autoRotate?: boolean
  rotationSpeed?: number
}

export interface ModelPermissions {
  canView: string[]
  canAnnotate: string[]
  canDownload: string[]
  canEdit: string[]
  isPublic: boolean
  shareLink?: string
  expiresAt?: Date
}

export interface LoadingState {
  isLoading: boolean
  progress: number
  error?: string
  stage: 'idle' | 'downloading' | 'parsing' | 'rendering' | 'complete' | 'error'
}

export interface ViewerControls {
  zoom: number
  rotation: { x: number, y: number, z: number }
  pan: { x: number, y: number }
  cameraMode: 'orbit' | 'fly' | 'walk'
  viewMode: 'shaded' | 'wireframe' | 'xray' | 'realistic'
  sectioning: {
    enabled: boolean
    plane: 'x' | 'y' | 'z'
    position: number
  }
}

export interface MeasurementTool {
  type: 'distance' | 'angle' | 'area' | 'volume'
  points: { x: number, y: number, z: number }[]
  result?: {
    value: number
    unit: string
    display: string
  }
  visible: boolean
  color: string
}

export interface ModelViewerConfig {
  supportedFormats: string[]
  maxFileSize: number // in bytes
  maxVertexCount: number
  maxTextureSize: number
  enableVR: boolean
  enableAR: boolean
  enableMeasurements: boolean
  enableAnnotations: boolean
  enableScreenshots: boolean
  enableExport: boolean
  defaultViewSettings: ViewSettings
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'glb' | 'obj'
  quality?: number
  includeAnnotations: boolean
  includeGrid: boolean
  backgroundColor?: string
  width?: number
  height?: number
}

export interface CollaborationSession {
  id: string
  modelId: string
  host: string
  participants: Participant[]
  startTime: Date
  isActive: boolean
  settings: {
    syncCamera: boolean
    syncAnnotations: boolean
    allowGuestAnnotations: boolean
  }
}

export interface Participant {
  id: string
  name: string
  role: 'host' | 'presenter' | 'viewer'
  isActive: boolean
  color: string
  cursor?: { x: number, y: number }
  cameraSync?: boolean
}