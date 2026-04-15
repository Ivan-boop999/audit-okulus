"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResponsiveDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>
  }
  return <Dialog {...props}>{children}</Dialog>
}

function ResponsiveDialogTrigger({
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetTrigger className={className} {...props} />
  }
  return <DialogTrigger className={className} {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn("max-h-[85vh] rounded-t-2xl", className)}
        {...(props as any)}
      >
        <div className="mx-auto mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted" />
        <ScrollArea className="flex-1 overflow-auto">
          {children}
        </ScrollArea>
      </SheetContent>
    )
  }
  return (
    <DialogContent className={className} {...(props as any)}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetHeader className={className} {...props} />
  }
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetFooter className={className} {...props} />
  }
  return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetTitle className={className} {...(props as any)} />
  }
  return <DialogTitle className={className} {...(props as any)} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetDescription className={className} {...(props as any)} />
  }
  return <DialogDescription className={className} {...(props as any)} />
}

function ResponsiveDialogClose(props: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <SheetClose {...props} />
  }
  return <DialogClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
}
