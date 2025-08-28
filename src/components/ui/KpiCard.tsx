import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiCard({
  icon,
  label,
  value,
  delta,
  trend = "flat",
  subtext,
  className,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  delta?: number
  trend?: "up" | "down" | "flat"
  subtext?: string
  className?: string
}) {
  const trendColor = trend === "up" ? "text-emerald-600 bg-emerald-50" : trend === "down" ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-100 dark:bg-slate-800/50"
  const trendSymbol = trend === "up" ? "▲" : trend === "down" ? "▼" : "—"
  return (
    <Card className={cn("shadow-sm transition-all hover:shadow-lg hover:scale-[1.01]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          {icon && <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary">{icon}</span>}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {typeof delta === "number" && (
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5", trendColor)}>
              <span className="mr-1">{trendSymbol}</span>
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          {subtext && <span className="truncate">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiCard

