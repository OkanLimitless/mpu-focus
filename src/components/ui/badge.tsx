import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "info"
    | "warning"
    | "muted"
    | "purple"
    | "orange"
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
  
  const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "border-transparent bg-blue-600 text-white",
    secondary: "border-transparent bg-gray-100 text-gray-800",
    destructive: "border-transparent bg-red-600 text-white",
    outline: "border-gray-300 text-gray-700 bg-transparent",
    success: "border-transparent bg-green-100 text-green-800",
    info: "border-transparent bg-blue-100 text-blue-800",
    warning: "border-transparent bg-yellow-100 text-yellow-800",
    muted: "border-transparent bg-gray-100 text-gray-800",
    purple: "border-transparent bg-purple-100 text-purple-800",
    orange: "border-transparent bg-orange-100 text-orange-800",
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  return (
    <div className={classes} {...props} />
  )
}

export { Badge }