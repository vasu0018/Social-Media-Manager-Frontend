export const contentTypes = ['reel', 'story', 'post', 'image'] as const
export type ContentType = (typeof contentTypes)[number]

export const platforms = ['instagram', 'facebook'] as const
export type Platform = (typeof platforms)[number]

export const contentStatuses = [
  'draft',
  'scheduled',
  'processing',
  'published',
  'partially_published',
  'failed',
  'cancelled',
] as const
export type ContentStatus = (typeof contentStatuses)[number]

export type PublishMode = 'draft' | 'schedule' | 'now'

export type ContentItem = {
  id: string
  title: string
  caption: string
  hashtags?: string
  firstComment?: string | null
  audio?: { id: string; title: string; artist: string | null; audioVolume: number; videoVolume: number } | null
  coverMediaId?: string | null
  thumbOffsetMs?: number | null
  publishOptions?: PublishOptions
  format?: string | null
  type: ContentType
  platforms: Platform[]
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  accountIds: string[]
  mediaId: string | null
  thumbnailUrl?: string | null
  error: string | null
  externalId: string | null
  timezone?: string
  publications?: PublicationRecord[]
  attempts?: PublishAttemptRecord[]
}

export type PlaceChoice = { id: string; name: string; address?: string | null }

export type InstagramUserTag = { username: string; x?: number; y?: number }

export type InstagramOptions = {
  location?: PlaceChoice | null
  userTags?: InstagramUserTag[]
  collaborators?: string[]
  altText?: string
  shareToFeed?: boolean
  trialReel?: 'off' | 'MANUAL' | 'SS_PERFORMANCE'
  audioName?: string
  commentsOff?: boolean
}

export type FacebookOptions = {
  place?: PlaceChoice | null
  countries?: string[]
  ageMin?: number | null
  altText?: string
  videoTitle?: string
}

export type PublishOptions = {
  instagram?: InstagramOptions
  facebook?: FacebookOptions
}

export type PublicationRecord = {
  id: string
  platform: Platform
  format: string
  accountId: string
  accountName: string
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  externalId: string | null
  permalink?: string | null
  errorCode?: string | null
  error: string | null
  retryable: boolean
  attemptCount: number
  scheduleId?: string | null
}

export type PublishAttemptRecord = {
  id: string
  publicationId: string
  platform: Platform
  startedAt: string
  finishedAt: string | null
  outcome: string
  errorCode?: string | null
  message: string | null
}

export type TokenStatus = 'valid' | 'expiring' | 'expired' | 'revoked' | 'disconnected' | 'unknown'

export type SocialAccount = {
  id: string
  platform: Platform
  name: string
  handle: string
  connected: boolean
  followers: number
  lastSyncedAt: string | null
  pictureUrl?: string | null
  accountType?: string | null
  tokenStatus?: TokenStatus
  eligible?: boolean
  eligibilityReason?: string | null
  grantedScopes?: string[]
  tokenExpiresAt?: string | null
  dataAccessExpiresAt?: string | null
  canBrowseSongs?: boolean
}

export type MediaAsset = {
  id: string
  name: string
  kind: 'video' | 'image'
  src: string | null
  captureSrc?: string | null
  tone: string
  createdAt: string
  sizeLabel: string
  mime?: string
  bytes?: number
  width?: number | null
  height?: number | null
  durationMs?: number | null
}

export type WorkspaceSettings = {
  displayName: string
  timezone: string
  emailNotifications: boolean
  failureAlerts: boolean
  defaultPlatforms: Platform[]
}

export type CreateContentInput = {
  title: string
  caption: string
  type: ContentType
  platforms: Platform[]
  publishMode: PublishMode
  scheduledAt: string
  mediaId: string | null
}
