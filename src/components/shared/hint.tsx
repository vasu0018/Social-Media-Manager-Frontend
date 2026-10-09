import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function Hint({ detail, children, className }: { detail: string; children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs px-3 py-2 text-left text-sm leading-5">{detail}</TooltipContent>
    </Tooltip>
  )
}

export function HintButton({
  detail,
  children,
  ...props
}: ComponentProps<typeof Button> & { detail: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs px-3 py-2 text-left text-sm leading-5">{detail}</TooltipContent>
    </Tooltip>
  )
}
