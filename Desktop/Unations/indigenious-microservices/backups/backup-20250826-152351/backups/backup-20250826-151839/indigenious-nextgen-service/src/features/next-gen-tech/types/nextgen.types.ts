// Next-Gen Technology Types
// Type definitions for blockchain, VR/AR, and emerging tech features

// Blockchain Types
export interface BlockchainIdentity {
  did: string // Decentralized Identifier
  address: string
  publicKey: string
  verifications: IdentityVerification[]
  reputation: number
  createdAt: string
  lastUpdated: string
}

export interface IdentityVerification {
  type: 'nation' | 'band' | 'business' | 'certification'
  issuer: string
  issuedAt: string
  expiresAt?: string
  proof: string
  metadata: Record<string, any>
}

export interface SmartContract {
  id: string
  address: string
  type: ContractType
  name: string
  description: string
  creator: string
  createdAt: string
  status: ContractStatus
  participants: string[]
  terms: ContractTerms
  transactions: Transaction[]
}

export type ContractType = 
  | 'procurement'
  | 'payment'
  | 'escrow'
  | 'milestone'
  | 'subscription'
  | 'revenue_share'

export type ContractStatus = 
  | 'draft'
  | 'deployed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface ContractTerms {
  value: number
  currency: string
  milestones?: Milestone[]
  conditions: string[]
  penalties?: Penalty[]
  disputeResolution: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  value: number
  dueDate: string
  status: 'pending' | 'completed' | 'verified'
  evidence?: string[]
}

export interface Penalty {
  condition: string
  amount: number
  recipient: string
}

export interface Transaction {
  hash: string
  from: string
  to: string
  value: number
  timestamp: string
  blockNumber: number
  gasUsed: number
  status: 'pending' | 'confirmed' | 'failed'
}

export interface CommunityToken {
  symbol: string
  name: string
  totalSupply: number
  decimals: number
  holders: number
  price: number
  marketCap: number
  uses: TokenUse[]
}

export interface TokenUse {
  type: 'governance' | 'reward' | 'payment' | 'staking'
  description: string
  allocation: number
}

// NFT Types
export interface NFTAsset {
  tokenId: string
  contractAddress: string
  type: NFTType
  name: string
  description: string
  creator: string
  owner: string
  metadata: NFTMetadata
  price?: number
  royalty?: number
  history: NFTTransaction[]
}

export type NFTType = 
  | 'art'
  | 'certification'
  | 'contract'
  | 'badge'
  | 'cultural'
  | 'utility'

export interface NFTMetadata {
  image: string
  animation?: string
  attributes: NFTAttribute[]
  culturalSignificance?: string
  story?: string
  unlockableContent?: string
}

export interface NFTAttribute {
  traitType: string
  value: string | number
  displayType?: string
}

export interface NFTTransaction {
  type: 'mint' | 'transfer' | 'sale' | 'burn'
  from: string
  to: string
  price?: number
  timestamp: string
  txHash: string
}

// VR/AR Types
export interface VREnvironment {
  id: string
  name: string
  type: 'showroom' | 'meeting' | 'training' | 'cultural'
  scene: VRScene
  objects: VRObject[]
  users: VRUser[]
  settings: VRSettings
}

export interface VRScene {
  skybox: string
  lighting: LightingConfig
  audio?: AudioConfig
  physics: boolean
  culturalElements?: CulturalElement[]
}

export interface VRObject {
  id: string
  type: 'product' | 'furniture' | 'display' | 'interactive'
  model: string
  position: Vector3
  rotation: Vector3
  scale: Vector3
  interactions?: Interaction[]
  metadata?: Record<string, any>
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Interaction {
  type: 'click' | 'hover' | 'grab' | 'proximity'
  action: string
  parameters?: Record<string, any>
}

export interface VRUser {
  id: string
  name: string
  avatar: string
  position: Vector3
  rotation: Vector3
  isHost: boolean
  isSpeaking: boolean
  permissions: VRPermission[]
}

export type VRPermission = 
  | 'move_objects'
  | 'spawn_objects'
  | 'screen_share'
  | 'moderate'
  | 'record'

export interface VRSettings {
  maxUsers: number
  quality: 'low' | 'medium' | 'high' | 'ultra'
  locomotion: 'teleport' | 'smooth' | 'both'
  comfort: ComfortSettings
  accessibility: AccessibilitySettings
}

export interface ComfortSettings {
  vignette: boolean
  snapTurn: boolean
  seated: boolean
  heightAdjust: boolean
}

export interface AccessibilitySettings {
  subtitles: boolean
  colorblind: boolean
  audioDescriptions: boolean
  hapticFeedback: boolean
}

export interface ARMarker {
  id: string
  type: 'image' | 'qr' | 'nfc' | 'gps'
  target: string
  content: ARContent
  analytics: ARAnalytics
}

export interface ARContent {
  type: 'model' | 'video' | 'info' | 'portal'
  source: string
  scale: number
  offset: Vector3
  animations?: ARAnimation[]
  interactions?: Interaction[]
}

export interface ARAnimation {
  name: string
  trigger: 'auto' | 'tap' | 'proximity'
  loop: boolean
  duration: number
}

export interface ARAnalytics {
  views: number
  interactions: number
  averageViewTime: number
  conversionRate: number
}

// Digital Twin Types
export interface DigitalTwin {
  id: string
  entityType: 'business' | 'project' | 'equipment' | 'process'
  entityId: string
  name: string
  visualization: TwinVisualization
  dataStreams: DataStream[]
  alerts: TwinAlert[]
  predictions: Prediction[]
}

export interface TwinVisualization {
  type: '2d' | '3d' | 'holographic'
  model: string
  realTimeData: boolean
  overlays: DataOverlay[]
  viewpoints: Viewpoint[]
}

export interface DataStream {
  id: string
  source: string
  metric: string
  value: number | string
  unit: string
  timestamp: string
  history: DataPoint[]
}

export interface DataPoint {
  value: number
  timestamp: string
}

export interface DataOverlay {
  type: 'gauge' | 'chart' | 'heatmap' | 'flow'
  dataStream: string
  position: Vector3
  style: OverlayStyle
}

export interface OverlayStyle {
  color: string
  size: number
  opacity: number
  animation?: string
}

export interface TwinAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  metric: string
  threshold: number
  triggered: string
  acknowledged: boolean
}

export interface Prediction {
  type: 'maintenance' | 'demand' | 'failure' | 'optimization'
  confidence: number
  timeframe: string
  recommendation: string
  impact: string
}

// Metaverse Types
export interface MetaverseSpace {
  id: string
  name: string
  type: 'storefront' | 'exhibition' | 'meeting' | 'social'
  world: string
  coordinates: Vector3
  capacity: number
  visitors: MetaverseVisitor[]
  features: SpaceFeature[]
  economy: SpaceEconomy
}

export interface MetaverseVisitor {
  id: string
  avatar: string
  wallet: string
  joinedAt: string
  interactions: number
  purchases: number
}

export interface SpaceFeature {
  type: 'portal' | 'vendor' | 'stage' | 'gallery' | 'game'
  location: Vector3
  configuration: Record<string, any>
}

export interface SpaceEconomy {
  currency: string
  totalSales: number
  averageTransaction: number
  topProducts: string[]
  conversionRate: number
}

// IPFS Types
export interface IPFSFile {
  cid: string // Content Identifier
  name: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: string
  pinned: boolean
  encrypted: boolean
  sharedWith: string[]
  metadata: FileMetadata
}

export interface FileMetadata {
  description?: string
  tags: string[]
  culturalProtocol?: string
  accessLevel: 'public' | 'community' | 'private' | 'sacred'
  backupNodes: string[]
}

// Quantum Security Types
export interface QuantumKey {
  id: string
  algorithm: 'kyber' | 'dilithium' | 'falcon' | 'sphincs'
  publicKey: string
  keySize: number
  createdAt: string
  expiresAt: string
  usage: KeyUsage[]
}

export interface KeyUsage {
  purpose: 'signing' | 'encryption' | 'authentication'
  usedAt: string
  operation: string
}

export interface QuantumSignature {
  algorithm: string
  signature: string
  publicKey: string
  timestamp: string
  quantumProof: string
}

// Cultural Elements
export interface CulturalElement {
  type: 'symbol' | 'pattern' | 'sound' | 'story'
  nation: string
  significance: string
  usage: 'open' | 'restricted' | 'sacred'
  representation: string
}

export interface LightingConfig {
  ambient: number
  directional: {
    intensity: number
    position: Vector3
    color: string
  }
  shadows: boolean
}

export interface AudioConfig {
  ambient: string
  volume: number
  spatial: boolean
  culturalMusic?: string
}

export interface Viewpoint {
  name: string
  position: Vector3
  rotation: Vector3
  isDefault: boolean
}

// Hologram Types
export interface Hologram {
  id: string
  type: 'elder' | 'product' | 'guide' | 'cultural'
  content: HologramContent
  triggers: HologramTrigger[]
  interactions: HologramInteraction[]
}

export interface HologramContent {
  model: string
  animations: string[]
  audio: string[]
  script?: DialogueScript[]
  culturalContext?: string
}

export interface HologramTrigger {
  type: 'proximity' | 'gesture' | 'voice' | 'schedule'
  parameters: Record<string, any>
}

export interface HologramInteraction {
  gesture: string
  response: string
  action?: string
}

export interface DialogueScript {
  id: string
  text: string
  audio: string
  animation: string
  duration: number
  nextOptions?: string[]
}