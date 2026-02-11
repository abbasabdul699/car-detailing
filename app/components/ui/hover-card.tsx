"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type Side = "top" | "right" | "bottom" | "left"
type Align = "start" | "center" | "end"

type HoverCardContextValue = {
  open: boolean
  openDelay: number
  closeDelay: number
  triggerRect: DOMRect | null
  setTriggerRect: (rect: DOMRect | null) => void
  openCard: () => void
  closeCard: () => void
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null)

const useHoverCardContext = () => {
  const ctx = React.useContext(HoverCardContext)
  if (!ctx) {
    throw new Error("HoverCard components must be used within <HoverCard>")
  }
  return ctx
}

const HoverCard = ({
  openDelay = 150,
  closeDelay = 100,
  children,
}: {
  openDelay?: number
  closeDelay?: number
  children: React.ReactNode
}) => {
  const [open, setOpen] = React.useState(false)
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null)
  const openTimeoutRef = React.useRef<number | null>(null)
  const closeTimeoutRef = React.useRef<number | null>(null)

  const clearOpenTimeout = () => {
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
  }

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const openCard = () => {
    clearCloseTimeout()
    clearOpenTimeout()
    openTimeoutRef.current = window.setTimeout(() => setOpen(true), openDelay)
  }

  const closeCard = () => {
    clearOpenTimeout()
    clearCloseTimeout()
    closeTimeoutRef.current = window.setTimeout(() => setOpen(false), closeDelay)
  }

  React.useEffect(() => {
    return () => {
      clearOpenTimeout()
      clearCloseTimeout()
    }
  }, [])

  return (
    <HoverCardContext.Provider
      value={{
        open,
        openDelay,
        closeDelay,
        triggerRect,
        setTriggerRect,
        openCard,
        closeCard,
      }}
    >
      {children}
    </HoverCardContext.Provider>
  )
}

const HoverCardTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean
  children: React.ReactElement
}) => {
  const { openCard, closeCard, setTriggerRect } = useHoverCardContext()

  if (!asChild) {
    return children
  }

  const child = React.Children.only(children)
  return React.cloneElement(child, {
    onMouseEnter: (event: React.MouseEvent) => {
      setTriggerRect((event.currentTarget as HTMLElement).getBoundingClientRect())
      openCard()
      child.props.onMouseEnter?.(event)
    },
    onMouseLeave: (event: React.MouseEvent) => {
      closeCard()
      child.props.onMouseLeave?.(event)
    },
    onFocus: (event: React.FocusEvent) => {
      setTriggerRect((event.currentTarget as HTMLElement).getBoundingClientRect())
      openCard()
      child.props.onFocus?.(event)
    },
    onBlur: (event: React.FocusEvent) => {
      closeCard()
      child.props.onBlur?.(event)
    },
  })
}

const getPosition = ({
  triggerRect,
  contentRect,
  side,
  align,
  sideOffset,
}: {
  triggerRect: DOMRect
  contentRect: DOMRect
  side: Side
  align: Align
  sideOffset: number
}) => {
  const centerX = triggerRect.left + triggerRect.width / 2
  const centerY = triggerRect.top + triggerRect.height / 2

  let top = 0
  let left = 0

  if (side === "right") {
    left = triggerRect.right + sideOffset
    top = centerY - contentRect.height / 2
  } else if (side === "left") {
    left = triggerRect.left - contentRect.width - sideOffset
    top = centerY - contentRect.height / 2
  } else if (side === "top") {
    top = triggerRect.top - contentRect.height - sideOffset
    left = centerX - contentRect.width / 2
  } else {
    top = triggerRect.bottom + sideOffset
    left = centerX - contentRect.width / 2
  }

  if (align === "start") {
    if (side === "top" || side === "bottom") {
      left = triggerRect.left
    } else {
      top = triggerRect.top
    }
  }

  if (align === "end") {
    if (side === "top" || side === "bottom") {
      left = triggerRect.right - contentRect.width
    } else {
      top = triggerRect.bottom - contentRect.height
    }
  }

  const maxLeft = window.innerWidth - contentRect.width - 8
  const maxTop = window.innerHeight - contentRect.height - 8

  return {
    top: Math.max(8, Math.min(top, maxTop)),
    left: Math.max(8, Math.min(left, maxLeft)),
  }
}

const HoverCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: Align
    side?: Side
    sideOffset?: number
  }
>(({ className, align = "center", side = "bottom", sideOffset = 4, ...props }, ref) => {
  const { open, triggerRect, openCard, closeCard } = useHoverCardContext()
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [contentSize, setContentSize] = React.useState<{ width: number; height: number } | null>(null)

  React.useLayoutEffect(() => {
    if (!open || !contentRef.current) return
    const measure = () => {
      const rect = contentRef.current?.getBoundingClientRect()
      if (!rect) return
      setContentSize((prev) => {
        if (!prev || prev.width !== rect.width || prev.height !== rect.height) {
          return { width: rect.width, height: rect.height }
        }
        return prev
      })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [open])

  if (!open || !triggerRect) return null

  const position = contentSize
    ? getPosition({
        triggerRect,
        contentRect: new DOMRect(0, 0, contentSize.width, contentSize.height),
        side,
        align,
        sideOffset,
      })
    : { top: triggerRect.bottom + sideOffset, left: triggerRect.left }

  return createPortal(
    <div
      ref={(node) => {
        contentRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      className={cn(
        "z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className
      )}
      style={{ position: "fixed", top: position.top, left: position.left }}
      data-state={open ? "open" : "closed"}
      onMouseEnter={openCard}
      onMouseLeave={closeCard}
      {...props}
    />,
    document.body
  )
})
HoverCardContent.displayName = "HoverCardContent"

export { HoverCard, HoverCardTrigger, HoverCardContent }
