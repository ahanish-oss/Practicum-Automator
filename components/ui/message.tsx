import * as React from "react"

export interface MessageContextValue {
  align: "start" | "end"
}

export const MessageContext = React.createContext<MessageContextValue | null>(null)

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end"
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, align = "start", children, ...props }, ref) => {
    return (
      <MessageContext.Provider value={{ align }}>
        <div
          ref={ref}
          className={`flex w-full items-end gap-3 ${
            align === "end" ? "flex-row-reverse" : "flex-row"
          } ${className || ""}`}
          {...props}
        >
          {children}
        </div>
      </MessageContext.Provider>
    )
  }
)
Message.displayName = "Message"

export interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`shrink-0 select-none pb-1 ${className || ""}`}
      {...props}
    />
  )
)
MessageAvatar.displayName = "MessageAvatar"

export interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(MessageContext)
    const align = context?.align || "start"

    return (
      <div
        ref={ref}
        className={`flex flex-col max-w-[85%] gap-1 ${
          align === "end" ? "items-end" : "items-start"
        } ${className || ""}`}
        {...props}
      />
    )
  }
)
MessageContent.displayName = "MessageContent"

export interface MessageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const MessageHeader = React.forwardRef<HTMLDivElement, MessageHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 text-[10px] text-gray-400 font-bold select-none ${className || ""}`}
      {...props}
    />
  )
)
MessageHeader.displayName = "MessageHeader"

export interface MessageFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const MessageFooter = React.forwardRef<HTMLDivElement, MessageFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider select-none ${className || ""}`}
      {...props}
    />
  )
)
MessageFooter.displayName = "MessageFooter"

export interface MessageGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const MessageGroup = React.forwardRef<HTMLDivElement, MessageGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col gap-2 w-full ${className || ""}`}
      {...props}
    />
  )
)
MessageGroup.displayName = "MessageGroup"

export { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter, MessageGroup }
