import * as React from "react"
import { ArrowDown } from "lucide-react"

export interface MessageScrollerContextValue {
  viewportRef: React.RefObject<HTMLDivElement | null>
  autoScroll: boolean
  isAtBottom: boolean
  scrollToBottom: () => void
  setIsAtBottom: (value: boolean) => void
}

const MessageScrollerContext = React.createContext<MessageScrollerContextValue | null>(null)

export interface MessageScrollerProviderProps {
  children: React.ReactNode
  autoScroll?: boolean
}

export function MessageScrollerProvider({
  children,
  autoScroll = true,
}: MessageScrollerProviderProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [isAtBottom, setIsAtBottom] = React.useState(true)

  const scrollToBottom = React.useCallback(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      })
      setIsAtBottom(true)
    }
  }, [])

  // Monitor element height changes or DOM insertions
  React.useEffect(() => {
    if (!autoScroll || !isAtBottom) return

    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new MutationObserver(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      })
    })

    observer.observe(viewport, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [autoScroll, isAtBottom])

  return (
    <MessageScrollerContext.Provider
      value={{
        viewportRef,
        autoScroll,
        isAtBottom,
        scrollToBottom,
        setIsAtBottom,
      }}
    >
      {children}
    </MessageScrollerContext.Provider>
  )
}

export function useMessageScroller() {
  const context = React.useContext(MessageScrollerContext)
  if (!context) {
    throw new Error("useMessageScroller must be used within a MessageScrollerProvider")
  }
  return context
}

export interface MessageScrollerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MessageScroller = React.forwardRef<HTMLDivElement, MessageScrollerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative flex flex-col min-h-0 w-full overflow-hidden ${className || ""}`}
        {...props}
      />
    )
  }
)
MessageScroller.displayName = "MessageScroller"

export interface MessageScrollerViewportProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MessageScrollerViewport = React.forwardRef<HTMLDivElement, MessageScrollerViewportProps>(
  ({ className, onScroll, ...props }, ref) => {
    const { viewportRef, setIsAtBottom } = useMessageScroller()

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const threshold = 16 // Pixels from bottom to count as "at bottom"
      const currentIsAtBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <= threshold
      setIsAtBottom(currentIsAtBottom)
      if (onScroll) onScroll(e)
    }

    // Merge refs safely
    React.useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement)

    return (
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto w-full no-scrollbar ${className || ""}`}
        {...props}
      />
    )
  }
)
MessageScrollerViewport.displayName = "MessageScrollerViewport"

export interface MessageScrollerContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const MessageScrollerContent = React.forwardRef<HTMLDivElement, MessageScrollerContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col gap-4 p-5 min-h-full justify-end ${className || ""}`}
        {...props}
      />
    )
  }
)
MessageScrollerContent.displayName = "MessageScrollerContent"

export interface MessageScrollerItemProps extends React.HTMLAttributes<HTMLDivElement> {
  messageId: string | number
  scrollAnchor?: boolean
}

export const MessageScrollerItem = React.forwardRef<HTMLDivElement, MessageScrollerItemProps>(
  ({ className, messageId, scrollAnchor, ...props }, ref) => {
    const { scrollToBottom, autoScroll } = useMessageScroller()

    React.useEffect(() => {
      if (scrollAnchor && autoScroll) {
        scrollToBottom()
      }
    }, [scrollAnchor, autoScroll, scrollToBottom])

    return (
      <div
        ref={ref}
        data-message-id={messageId}
        className={`w-full ${className || ""}`}
        {...props}
      />
    )
  }
)
MessageScrollerItem.displayName = "MessageScrollerItem"

export interface MessageScrollerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const MessageScrollerButton = React.forwardRef<HTMLButtonElement, MessageScrollerButtonProps>(
  ({ className, ...props }, ref) => {
    const { isAtBottom, scrollToBottom } = useMessageScroller()

    if (isAtBottom) return null

    return (
      <button
        ref={ref}
        type="button"
        onClick={scrollToBottom}
        className={`absolute bottom-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 border-none cursor-pointer ${className || ""}`}
        title="Scroll to bottom"
        {...props}
      >
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </button>
    )
  }
)
MessageScrollerButton.displayName = "MessageScrollerButton"
