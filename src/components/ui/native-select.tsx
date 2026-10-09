import type { ComponentProps } from 'react'
import { cn, controlClass } from '@/lib/utils'

function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlClass, 'pr-8', className)} {...props} />
}

export { NativeSelect }
