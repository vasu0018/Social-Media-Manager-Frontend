import type { ComponentProps } from 'react'
import { cn, controlClass } from '@/lib/utils'

function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, className)} {...props} />
}

export { Input }
