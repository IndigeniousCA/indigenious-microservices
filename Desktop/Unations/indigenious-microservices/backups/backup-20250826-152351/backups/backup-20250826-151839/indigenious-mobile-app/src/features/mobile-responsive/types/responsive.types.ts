// Mobile-Responsive Types
// TypeScript types for responsive design system

export type Breakpoint = 'mobile' | 'phablet' | 'tablet' | 'desktop' | 'wide' | 'ultra'
export type CommunityBreakpoint = 'basic-phone' | 'satellite-tablet' | 'community-center'

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv'
export type Orientation = 'portrait' | 'landscape'
export type TouchCapability = 'touch' | 'no-touch' | 'hybrid'

export interface BreakpointConfig {
  mobile: number
  phablet: number
  tablet: number
  desktop: number
  wide: number
  ultra: number
}

export interface ResponsiveValue<T> {
  mobile?: T
  phablet?: T
  tablet?: T
  desktop?: T
  wide?: T
  ultra?: T
  default: T
}

export interface ViewportInfo {
  width: number
  height: number
  breakpoint: Breakpoint
  deviceType: DeviceType
  orientation: Orientation
  touchCapability: TouchCapability
  isRetina: boolean
  pixelRatio: number
}

export interface ConnectionInfo {
  online: boolean
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown'
  downlink: number
  rtt: number
  saveData: boolean
}

export interface DeviceCapabilities {
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  serviceWorker: boolean
  webGL: boolean
  webRTC: boolean
  geolocation: boolean
  camera: boolean
  microphone: boolean
  battery: boolean
  vibration: boolean
  gamepad: boolean
}

export interface ResponsiveConfig {
  breakpoints: BreakpointConfig
  communityBreakpoints: Record<CommunityBreakpoint, number>
  touchTargetSize: {
    minimum: number
    comfortable: number
    accessible: number
  }
  spacing: {
    mobile: Record<string, string>
    tablet: Record<string, string>
    desktop: Record<string, string>
  }
  typography: {
    mobile: Record<string, string>
    tablet: Record<string, string>
    desktop: Record<string, string>
  }
}

export interface TouchGesture {
  type: 'tap' | 'long-press' | 'swipe' | 'pinch' | 'drag'
  startX: number
  startY: number
  endX?: number
  endY?: number
  duration: number
  distance?: number
  scale?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export interface SwipeDirection {
  horizontal: 'left' | 'right' | 'none'
  vertical: 'up' | 'down' | 'none'
}

export interface ResponsiveImage {
  src: string
  srcSet?: string
  sizes?: string
  alt: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  placeholder?: string
  blurDataURL?: string
}

export interface AdaptiveContent {
  mobile: React.ReactNode
  tablet?: React.ReactNode
  desktop?: React.ReactNode
  fallback?: React.ReactNode
}

export interface OfflineCapability {
  canCache: boolean
  canSync: boolean
  canFunction: boolean
  priority: 'high' | 'medium' | 'low'
  syncStrategy: 'immediate' | 'background' | 'manual'
}

export interface ResponsiveNavigation {
  type: 'drawer' | 'tabs' | 'sidebar' | 'dropdown'
  position: 'top' | 'bottom' | 'left' | 'right'
  trigger: 'click' | 'hover' | 'swipe'
  overlay: boolean
  persistent: boolean
}

export interface MobileOptimization {
  lazyLoad: boolean
  prefetch: boolean
  compress: boolean
  webp: boolean
  critical: boolean
  defer: boolean
}

export interface AccessibilityFeatures {
  screenReader: boolean
  keyboardNavigation: boolean
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  voiceControl: boolean
}

export interface CulturalAdaptation {
  language: string
  readingDirection: 'ltr' | 'rtl'
  numberFormat: string
  dateFormat: string
  colorScheme: 'traditional' | 'modern' | 'seasonal'
  symbolSet: 'standard' | 'traditional' | 'community'
}

export interface PerformanceMetrics {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  tti: number // Time to Interactive
  tbt: number // Total Blocking Time
}

export interface ResponsiveState {
  viewport: ViewportInfo
  connection: ConnectionInfo
  capabilities: DeviceCapabilities
  preferences: {
    reducedMotion: boolean
    highContrast: boolean
    darkMode: boolean
    fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  }
  performance: PerformanceMetrics
}

export interface ResponsiveProps {
  children: React.ReactNode
  className?: string
  breakpoint?: Breakpoint | Breakpoint[]
  hide?: Breakpoint | Breakpoint[]
  show?: Breakpoint | Breakpoint[]
  adapt?: boolean
  optimized?: boolean
}

export interface TouchProps {
  onTap?: (event: TouchGesture) => void
  onLongPress?: (event: TouchGesture) => void
  onSwipe?: (event: TouchGesture) => void
  onPinch?: (event: TouchGesture) => void
  onDrag?: (event: TouchGesture) => void
  disabled?: boolean
  threshold?: {
    tap: number
    longPress: number
    swipe: number
    pinch: number
  }
}

export interface GridResponsiveProps {
  columns: ResponsiveValue<number>
  gap?: ResponsiveValue<string>
  rows?: ResponsiveValue<number>
  areas?: ResponsiveValue<string>
  autoFlow?: ResponsiveValue<'row' | 'column' | 'dense'>
  justify?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly'>
  align?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch'>
}

export interface FlexResponsiveProps {
  direction?: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>
  wrap?: ResponsiveValue<'nowrap' | 'wrap' | 'wrap-reverse'>
  justify?: ResponsiveValue<'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'>
  align?: ResponsiveValue<'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'>
  gap?: ResponsiveValue<string>
}

export interface ResponsiveTextProps {
  size?: ResponsiveValue<string>
  lineHeight?: ResponsiveValue<string>
  weight?: ResponsiveValue<string>
  color?: ResponsiveValue<string>
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>
  transform?: ResponsiveValue<'none' | 'uppercase' | 'lowercase' | 'capitalize'>
}

export interface ResponsiveSpacingProps {
  margin?: ResponsiveValue<string>
  marginTop?: ResponsiveValue<string>
  marginRight?: ResponsiveValue<string>
  marginBottom?: ResponsiveValue<string>
  marginLeft?: ResponsiveValue<string>
  marginX?: ResponsiveValue<string>
  marginY?: ResponsiveValue<string>
  padding?: ResponsiveValue<string>
  paddingTop?: ResponsiveValue<string>
  paddingRight?: ResponsiveValue<string>
  paddingBottom?: ResponsiveValue<string>
  paddingLeft?: ResponsiveValue<string>
  paddingX?: ResponsiveValue<string>
  paddingY?: ResponsiveValue<string>
}

export interface OfflineAction {
  id: string
  type: string
  data: unknown
  timestamp: number
  retries: number
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'syncing' | 'completed' | 'failed'
}

export interface CacheStrategy {
  type: 'cache-first' | 'network-first' | 'cache-only' | 'network-only' | 'stale-while-revalidate'
  maxAge: number
  maxEntries?: number
  updateInterval?: number
}

export interface PWAConfig {
  name: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  orientation: 'portrait' | 'landscape' | 'any'
  startUrl: string
  scope: string
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose?: 'any' | 'maskable' | 'monochrome'
  }>
}