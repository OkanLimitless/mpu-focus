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
    secondary: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    destructive: "border-transparent bg-rose-600 text-white",
    outline: "border-gray-300 text-gray-700 bg-transparent dark:border-gray-600 dark:text-gray-200",
    success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    info: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    muted: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
    purple: "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    orange: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  return (
    <div className={classes} {...props} />
  )
}

export { Badge }