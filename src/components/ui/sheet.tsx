import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps, ReactNode } from 'react'

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-slate-950/60" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl focus:outline-none">
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Primary sections of the admin panel
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function SheetClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

export { Sheet, SheetClose }
