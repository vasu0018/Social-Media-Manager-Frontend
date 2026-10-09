import { z } from 'zod'
import type { SocialAccount } from '@/types/content'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be 60 characters or fewer'),
  timezone: z.string().min(1, 'Choose a timezone'),
  emailNotifications: z.boolean(),
  failureAlerts: z.boolean(),
  defaultPlatforms: z
    .array(z.enum(['instagram', 'facebook']))
    .min(1, 'Choose at least one default platform'),
})

export const accountSchema = z.object({
  name: z.string().trim().min(2, 'Enter the account name').max(80),
  handle: z.string().trim().min(2, 'Enter the username or Page name').max(80),
})

export function createContentSchema(accounts: SocialAccount[]) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(2, 'Enter a title with at least 2 characters')
        .max(80, 'Title must be 80 characters or fewer'),
      caption: z
        .string()
        .trim()
        .min(1, 'Enter a caption')
        .max(2200, 'Caption must be 2,200 characters or fewer'),
      type: z.enum(['reel', 'story', 'post', 'image']),
      platforms: z
        .array(z.enum(['instagram', 'facebook']))
        .min(1, 'Select at least one platform'),
      publishMode: z.enum(['draft', 'schedule', 'now']),
      scheduledAt: z.string(),
      mediaId: z.string().nullable(),
    })
    .superRefine((value, ctx) => {
      if (value.publishMode === 'schedule') {
        if (!value.scheduledAt) {
          ctx.addIssue({
            code: 'custom',
            message: 'Choose a date and time',
            path: ['scheduledAt'],
            input: value.scheduledAt,
          })
        } else {
          const time = new Date(value.scheduledAt).getTime()
          if (Number.isNaN(time) || time <= Date.now()) {
            ctx.addIssue({
              code: 'custom',
              message: 'Choose a future date and time',
              path: ['scheduledAt'],
              input: value.scheduledAt,
            })
          }
        }
      }

      if (value.publishMode !== 'draft' && !value.mediaId) {
        ctx.addIssue({
          code: 'custom',
          message: 'Add media before scheduling or publishing',
          path: ['mediaId'],
          input: value.mediaId,
        })
      }

      if (value.publishMode !== 'draft') {
        for (const platform of value.platforms) {
          const ready = accounts.some(
            (account) => account.connected && account.platform === platform,
          )
          if (!ready) {
            ctx.addIssue({
              code: 'custom',
              message: `Connect a ${platform === 'instagram' ? 'Instagram' : 'Facebook'} account before scheduling or publishing`,
              path: ['platforms'],
              input: value.platforms,
            })
          }
        }
      }
    })
}

export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const map: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!map[key]) map[key] = issue.message
  }
  return map
}
