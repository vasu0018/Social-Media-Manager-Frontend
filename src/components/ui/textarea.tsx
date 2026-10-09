import type { ComponentProps } from 'react'
import { cn, controlClass } from '@/lib/utils'

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(controlClass, 'min-h-28 resize-y py-2 leading-6', className)}
      {...props}
    />
  )
}

export { Textarea }
