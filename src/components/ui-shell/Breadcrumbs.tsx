"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export interface Crumb {
  href: string
  label: string
}

export function Breadcrumbs({
  baseLabel = "Home",
  baseHref = "/",
}: {
  baseLabel?: string
  baseHref?: string
}) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs: Crumb[] = [
    { href: baseHref, label: baseLabel },
    ...segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/")
      const label = seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      return { href, label }
    }),
  ]

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex items-center gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li key={crumb.href} className="inline-flex items-center">
              {idx > 0 && <span className="mx-1" aria-hidden>/</span>}
              {isLast ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:underline focus-visible:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs

