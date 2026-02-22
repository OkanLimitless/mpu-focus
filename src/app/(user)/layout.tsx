'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import CommandPalette from '@/components/ui/command-palette'
import { Menu, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const navItems = [
  { href: '/learn', label: 'Learn' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/course', label: 'Course' },
  { href: '/quiz', label: 'Quiz' },
]

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const userInitials = `${session?.user?.firstName?.[0] || ''}${session?.user?.lastName?.[0] || ''}`.toUpperCase()
  const year = new Date().getFullYear()

  return (
    <div className={`${bodyFont.className} min-h-screen bg-[#edf2f8] text-slate-900`}>
      <CommandPalette context="user" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/learn" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-blue-600" />
              <div className="hidden sm:block">
                <p className={`${displayFont.className} text-sm tracking-[0.18em]`}>MPU FOCUS</p>
                <p className="text-xs text-slate-300">Learning Platform</p>
              </div>
            </Link>

            <nav className="ml-4 hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={cn(
                        'inline-flex h-9 items-center rounded-xl px-3 text-sm transition-colors',
                        isActive
                          ? 'bg-white text-slate-900'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {session?.user && (
              <p className="hidden text-sm text-slate-200 md:block">
                Welcome, {session.user.firstName}
              </p>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white ring-2 ring-orange-300/50">
              {userInitials || <User className="h-4 w-4" />}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden border-white/20 bg-white/5 text-white hover:bg-white/15 md:inline-flex"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Logout
            </Button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-slate-900 px-4 py-4 lg:hidden">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-xl px-3 py-2 text-sm',
                      isActive ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-white/10',
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full border-white/20 bg-white/5 text-white hover:bg-white/15"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="relative min-h-[calc(100vh-64px)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-0 top-16 h-72 w-72 rounded-full bg-cyan-100 blur-3xl" />
          <div className="absolute right-0 top-6 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
        </div>
        <div className="relative">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-orange-500 to-blue-600" />
            <span className="text-slate-700">MPU Focus</span>
          </div>
          <div className="text-slate-500">© {year} MPU Focus. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
