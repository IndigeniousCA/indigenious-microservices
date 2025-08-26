// Community & Governance Types
// Type definitions for community engagement and governance features

export interface CommunityMember {
  id: string
  businessId: string
  businessName: string
  userId: string
  userName: string
  role: MemberRole
  joinedAt: string
  reputation: number
  contributions: {
    posts: number
    comments: number
    resources: number
    mentorships: number
    votes: number
  }
  badges: CommunityBadge[]
  status: 'active' | 'inactive' | 'suspended'
  preferences: MemberPreferences
}

export type MemberRole = 
  | 'member'
  | 'mentor'
  | 'elder'
  | 'moderator'
  | 'board_member'
  | 'admin'

export interface MemberPreferences {
  notifications: {
    forums: boolean
    mentions: boolean
    events: boolean
    governance: boolean
    mentorship: boolean
  }
  privacy: {
    showProfile: boolean
    allowMessages: boolean
    shareContact: boolean
  }
  interests: string[]
  languages: string[]
}

export interface CommunityBadge {
  id: string
  type: BadgeType
  name: string
  description: string
  icon: string
  earnedAt: string
  criteria: string
}

export type BadgeType = 
  | 'contributor'
  | 'mentor'
  | 'helper'
  | 'expert'
  | 'leader'
  | 'innovator'
  | 'collaborator'

export interface ForumCategory {
  id: string
  name: string
  description: string
  icon: string
  slug: string
  parentId?: string
  order: number
  isPrivate: boolean
  requiredRole?: MemberRole
  stats: {
    topics: number
    posts: number
    lastActivity: string
  }
}

export interface ForumTopic {
  id: string
  categoryId: string
  title: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  isPinned: boolean
  isLocked: boolean
  isAnnouncement: boolean
  tags: string[]
  views: number
  replies: number
  lastReplyAt?: string
  lastReplyBy?: string
  attachments?: Attachment[]
}

export interface ForumPost {
  id: string
  topicId: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  editedAt?: string
  editedBy?: string
  replyToId?: string
  reactions: Reaction[]
  attachments?: Attachment[]
  isAcceptedAnswer: boolean
  moderationStatus: 'approved' | 'pending' | 'flagged' | 'removed'
}

export interface Reaction {
  type: 'like' | 'helpful' | 'celebrate' | 'insightful'
  count: number
  userIds: string[]
}

export interface Attachment {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface ElderCouncil {
  members: Elder[]
  meetings: ElderMeeting[]
  guidance: CulturalGuidance[]
  protocols: CulturalProtocol[]
}

export interface Elder {
  id: string
  name: string
  nation: string
  community: string
  expertise: string[]
  bio: string
  photoUrl?: string
  isActive: boolean
  joinedCouncil: string
  availability: {
    schedule: string
    preferredContact: 'video' | 'phone' | 'message'
  }
}

export interface ElderMeeting {
  id: string
  title: string
  date: string
  attendees: string[]
  agenda: string[]
  minutes?: string
  decisions: string[]
  recordings?: string[]
  isPublic: boolean
}

export interface CulturalGuidance {
  id: string
  topic: string
  question: string
  guidance: string
  elderId: string
  elderName: string
  date: string
  category: 'business' | 'protocol' | 'ceremony' | 'language' | 'general'
  isPublic: boolean
}

export interface CulturalProtocol {
  id: string
  title: string
  description: string
  context: string
  guidelines: string[]
  doList: string[]
  dontList: string[]
  relatedTo: 'meeting' | 'ceremony' | 'business' | 'communication'
  nations?: string[]
}

export interface Proposal {
  id: string
  title: string
  description: string
  category: ProposalCategory
  authorId: string
  authorName: string
  createdAt: string
  status: ProposalStatus
  votingStartDate?: string
  votingEndDate?: string
  discussion: {
    forumTopicId: string
    commentCount: number
  }
  impact: {
    scope: 'platform' | 'community' | 'feature' | 'policy'
    estimatedCost?: number
    estimatedTime?: string
    affectedUsers: number
  }
  attachments?: Attachment[]
  implementation?: {
    assignedTo?: string
    startDate?: string
    completionDate?: string
    updates: ProposalUpdate[]
  }
}

export type ProposalCategory = 
  | 'feature'
  | 'policy'
  | 'governance'
  | 'budget'
  | 'partnership'
  | 'event'
  | 'other'

export type ProposalStatus = 
  | 'draft'
  | 'review'
  | 'discussion'
  | 'voting'
  | 'approved'
  | 'rejected'
  | 'implementing'
  | 'completed'

export interface ProposalUpdate {
  date: string
  update: string
  updatedBy: string
}

export interface Vote {
  proposalId: string
  voterId: string
  voterName: string
  vote: 'yes' | 'no' | 'abstain'
  comment?: string
  votedAt: string
  weight: number // For weighted voting systems
}

export interface VotingResult {
  proposalId: string
  totalVotes: number
  yesVotes: number
  noVotes: number
  abstainVotes: number
  percentageYes: number
  percentageNo: number
  percentageAbstain: number
  quorumMet: boolean
  passed: boolean
  certifiedAt?: string
  certifiedBy?: string
}

export interface Mentorship {
  id: string
  mentorId: string
  mentorName: string
  menteeId: string
  menteeName: string
  programType: MentorshipProgram
  status: MentorshipStatus
  startDate: string
  endDate?: string
  goals: MentorshipGoal[]
  sessions: MentorshipSession[]
  feedback: MentorshipFeedback[]
  matchScore: number
  matchReason: string[]
}

export type MentorshipProgram = 
  | 'quick_connect' // One-time session
  | 'short_term'    // 3 months
  | 'standard'      // 6 months
  | 'extended'      // 12 months
  | 'peer_circle'   // Group mentoring

export type MentorshipStatus = 
  | 'pending'
  | 'active'
  | 'paused'
  | 'completed'
  | 'terminated'

export interface MentorshipGoal {
  id: string
  goal: string
  targetDate: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress: number
  notes?: string
}

export interface MentorshipSession {
  id: string
  date: string
  duration: number // minutes
  type: 'video' | 'phone' | 'message' | 'in_person'
  topics: string[]
  notes?: string
  nextSteps?: string[]
  recordingUrl?: string
}

export interface MentorshipFeedback {
  from: 'mentor' | 'mentee'
  date: string
  rating: number
  comments: string
  wouldRecommend: boolean
}

export interface KnowledgeResource {
  id: string
  title: string
  description: string
  category: ResourceCategory
  type: ResourceType
  content?: string
  fileUrl?: string
  videoUrl?: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  tags: string[]
  views: number
  downloads: number
  ratings: ResourceRating[]
  isOfficial: boolean
  isFeatured: boolean
  relatedResources: string[]
  prerequisites?: string[]
  estimatedTime?: string
}

export type ResourceCategory = 
  | 'procurement'
  | 'business_development'
  | 'financial'
  | 'legal'
  | 'marketing'
  | 'technology'
  | 'cultural'
  | 'certification'

export type ResourceType = 
  | 'guide'
  | 'template'
  | 'video'
  | 'webinar'
  | 'checklist'
  | 'case_study'
  | 'tool'
  | 'course'

export interface ResourceRating {
  userId: string
  rating: number
  review?: string
  helpful: number
  date: string
}

export interface CommunityEvent {
  id: string
  title: string
  description: string
  type: EventType
  format: 'virtual' | 'in_person' | 'hybrid'
  startDate: string
  endDate: string
  timezone: string
  location?: {
    venue?: string
    address?: string
    city?: string
    province?: string
    virtualLink?: string
  }
  organizer: {
    id: string
    name: string
    type: 'platform' | 'community' | 'partner'
  }
  capacity?: number
  registrations: EventRegistration[]
  agenda?: EventAgendaItem[]
  speakers?: EventSpeaker[]
  sponsors?: string[]
  resources?: string[]
  recordingUrl?: string
  feedback?: EventFeedback[]
}

export type EventType = 
  | 'workshop'
  | 'networking'
  | 'training'
  | 'conference'
  | 'celebration'
  | 'ceremony'
  | 'meetup'

export interface EventRegistration {
  userId: string
  userName: string
  businessName: string
  registeredAt: string
  status: 'registered' | 'waitlist' | 'cancelled' | 'attended'
  checkInTime?: string
}

export interface EventAgendaItem {
  time: string
  duration: number
  title: string
  description?: string
  speakers?: string[]
  type: 'presentation' | 'panel' | 'workshop' | 'networking' | 'break'
}

export interface EventSpeaker {
  name: string
  title: string
  organization: string
  bio: string
  photoUrl?: string
  linkedIn?: string
}

export interface EventFeedback {
  userId: string
  rating: number
  comments: string
  wouldRecommend: boolean
  suggestions?: string
}

export interface GovernanceBoard {
  members: BoardMember[]
  committees: Committee[]
  meetings: BoardMeeting[]
  policies: Policy[]
  reports: GovernanceReport[]
}

export interface BoardMember {
  id: string
  userId: string
  name: string
  position: BoardPosition
  region: string
  term: {
    startDate: string
    endDate: string
    termNumber: number
  }
  bio: string
  photoUrl?: string
  committees: string[]
}

export type BoardPosition = 
  | 'chair'
  | 'vice_chair'
  | 'secretary'
  | 'treasurer'
  | 'member'

export interface Committee {
  id: string
  name: string
  mandate: string
  chair: string
  members: string[]
  meetingSchedule: string
  responsibilities: string[]
  currentProjects: string[]
}

export interface BoardMeeting {
  id: string
  date: string
  type: 'regular' | 'special' | 'agm'
  attendees: string[]
  agenda: string[]
  minutes: string
  decisions: BoardDecision[]
  isPublic: boolean
  recordingUrl?: string
}

export interface BoardDecision {
  id: string
  title: string
  description: string
  votingRecord: {
    inFavor: string[]
    against: string[]
    abstain: string[]
  }
  passed: boolean
  implementationDate?: string
}

export interface Policy {
  id: string
  title: string
  category: 'governance' | 'community' | 'platform' | 'financial'
  content: string
  version: string
  effectiveDate: string
  approvedBy: string
  approvedDate: string
  reviewDate: string
  attachments?: Attachment[]
}

export interface GovernanceReport {
  id: string
  title: string
  period: {
    start: string
    end: string
  }
  type: 'annual' | 'quarterly' | 'special'
  sections: ReportSection[]
  publishedDate: string
  approvedBy: string
  fileUrl: string
}

export interface ReportSection {
  title: string
  content: string
  data?: any
  charts?: unknown[]
}

export interface ResourceSharing {
  id: string
  type: 'equipment' | 'skill' | 'space' | 'service'
  title: string
  description: string
  category: string
  ownerId: string
  ownerName: string
  availability: ResourceAvailability
  terms: ResourceTerms
  images?: string[]
  location?: {
    city: string
    province: string
    radius?: number
  }
  requests: ResourceRequest[]
  reviews: ResourceReview[]
}

export interface ResourceAvailability {
  status: 'available' | 'in_use' | 'maintenance' | 'unavailable'
  schedule?: {
    days: string[]
    hours: string
  }
  blackoutDates?: string[]
}

export interface ResourceTerms {
  type: 'free' | 'trade' | 'rental' | 'negotiable'
  price?: number
  priceUnit?: 'hour' | 'day' | 'week' | 'month' | 'project'
  deposit?: number
  conditions: string[]
  insurance: boolean
  delivery: 'pickup' | 'delivery' | 'both'
}

export interface ResourceRequest {
  id: string
  requesterId: string
  requesterName: string
  requestDate: string
  startDate: string
  endDate: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  messages: ResourceMessage[]
}

export interface ResourceMessage {
  from: string
  date: string
  message: string
}

export interface ResourceReview {
  userId: string
  userName: string
  rating: number
  comment: string
  date: string
  photos?: string[]
}