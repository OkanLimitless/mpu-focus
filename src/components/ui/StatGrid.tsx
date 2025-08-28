import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6", className)}>
      {children}
    </div>
  )
}

export default StatGrid

