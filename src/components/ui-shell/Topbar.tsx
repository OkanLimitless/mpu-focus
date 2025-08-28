"use client"

import { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "./Breadcrumbs"
import ThemeToggle from "./ThemeToggle"
import { Search, Plus, HelpCircle } from "lucide-react"

export function Topbar({
  title,
  actions,
}: {
  title?: string
  actions?: ReactNode
}) {
  return (
    <header className="bg-white/80 dark:bg-[#0e1116]/90 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0e1116]/60 backdrop-blur shadow-sm border-b px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Breadcrumbs baseLabel="Admin" baseHref="/admin" />
          {title ? (
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground truncate">{title}</h1>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              id="global-search-input"
              aria-label="Global search"
              className="pl-8 w-72 bg-background border border-border"
              placeholder="Search... (/ to focus)"
            />
          </div>
          {actions}
          <Button id="help-dialog-trigger" variant="outline" size="icon" aria-label="Open help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button variant="secondary" size="sm" className="hidden md:inline-flex">
            <Plus className="h-4 w-4 mr-1" />
            Quick Action
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Topbar

