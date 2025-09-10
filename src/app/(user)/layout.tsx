'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/language-switcher'
import CommandPalette from '@/components/ui/command-palette'
import { User } from 'lucide-react'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const userInitials = `${session?.user?.firstName?.[0] || ''}${session?.user?.lastName?.[0] || ''}`.toUpperCase()
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <CommandPalette context="user" />
      <header className="sticky top-0 z-40 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/learn" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Logo" className="h-6 w-6" />
              <span className="text-lg font-semibold text-gray-900">MPU Focus</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {session?.user && (
              <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-700">
                Willkommen, {session.user.firstName} {session.user.lastName}
              </div>
            )}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher />
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-blue-100">
              {userInitials || <User className="h-4 w-4" />}
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="mt-8 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="h-5 w-5" />
            <span className="text-sm text-gray-600">MPU Focus</span>
          </div>
          <div className="text-sm text-gray-500">© {year} MPU Focus. Alle Rechte vorbehalten.</div>
        </div>
      </footer>
    </div>
  )
}
