"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Users, UserCheck, FileCheck, BookOpen, Video, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

export interface SidebarItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

const items: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin?section=users", label: "Users", icon: Users },
  { href: "/admin?section=leads", label: "Leads", icon: UserCheck },
  { href: "/admin?section=verification", label: "Verification", icon: FileCheck },
  { href: "/admin?section=chapters", label: "Modules", icon: BookOpen },
  { href: "/admin?section=videos", label: "Videos", icon: Video },
  { href: "/admin?section=settings", label: "Settings", icon: Settings },
]

export function Sidebar({
  collapsed = false,
  pendingCounts,
}: {
  collapsed?: boolean
  pendingCounts?: Partial<Record<string, number>>
}) {
  const pathname = usePathname()
  const router = useRouter()

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/") {
        const el = document.getElementById("global-search-input") as HTMLInputElement | null
        if (el) {
          e.preventDefault()
          el.focus()
        }
      }
      if (e.key === "?" && !e.shiftKey) return
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault()
        const help = document.getElementById("help-dialog-trigger") as HTMLButtonElement | null
        help?.click()
      }
      if (e.key === "g") {
        let buffer = ""
        const handler = (ev: KeyboardEvent) => {
          buffer += ev.key
          if (buffer === "gu") router.push("/admin?section=users")
          if (buffer === "gl") router.push("/admin?section=leads")
          if (buffer === "gm") router.push("/admin?section=chapters")
          window.removeEventListener("keydown", handler)
        }
        window.addEventListener("keydown", handler, { once: true })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  return (
    <aside className={cn(
      "h-full bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-r",
      collapsed ? "w-16" : "w-72"
    )}>
      <nav className="p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href === "/admin" && pathname.startsWith("/admin"))
            const Icon = item.icon
            const count = pendingCounts?.[item.label.toLowerCase()]
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2",
                    isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}/>
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {typeof count === "number" && count > 0 && (
                    <span className={cn(
                      "ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs",
                      isActive ? "bg-primary-foreground/20" : "bg-emerald-100 text-emerald-800"
                    )}
                      aria-label={`${count} pending`}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar

