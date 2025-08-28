"use client"

import { ReactNode, useMemo, useState } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export function AppShell({ children, title, pendingCounts }: {
  children: ReactNode
  title?: string
  pendingCounts?: Partial<Record<string, number>>
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} pendingCounts={pendingCounts} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell

