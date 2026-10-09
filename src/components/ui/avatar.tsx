import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center bg-secondary text-xs font-semibold text-secondary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback }
