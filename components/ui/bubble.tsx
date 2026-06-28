import * as React from "react"
import { MessageContext } from "./message"

export interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "ghost"
}

const Bubble = React.forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const context = React.useContext(MessageContext)
    const align = context?.align || "start"

    // Modern luxury startup theme styles for bubbles
    const styles = {
      default: align === "end"
        ? "bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-100/50"
        : "bg-white text-gray-800 border border-gray-150 shadow-xs",
      outline: "border border-gray-200 bg-transparent text-gray-800",
      ghost: "bg-transparent text-gray-800"
    }

    const roundedStyles = align === "end"
      ? "rounded-2xl rounded-br-xs"
      : "rounded-2xl rounded-bl-xs"

    return (
      <div
        ref={ref}
        className={`flex flex-col transition-all duration-200 select-text ${roundedStyles} ${styles[variant]} ${className || ""}`}
        {...props}
      />
    )
  }
)
Bubble.displayName = "Bubble"

export interface BubbleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const BubbleContent = React.forwardRef<HTMLDivElement, BubbleContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap select-text font-medium ${className || ""}`}
      {...props}
    />
  )
)
BubbleContent.displayName = "BubbleContent"

export { Bubble, BubbleContent }
