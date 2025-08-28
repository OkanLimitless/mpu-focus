"use client"

import type { ReactNode } from "react"
import { AppShell } from "@/components/ui-shell"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Admin">
      {children}
    </AppShell>
  )
}

