'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import { Bell, LayoutDashboard, Users, Video, LogOut, Menu, X, Lock, RefreshCw, UserRound, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })

function getDisplayName(session: NonNullable<ReturnType<typeof useSession>['data']>) {
    const firstName = session.user?.firstName?.trim()
    const lastName = session.user?.lastName?.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    return fullName || session.user?.email?.split('@')[0] || 'Admin'
}

function getInitials(name: string, email?: string | null) {
    const source = name && name !== 'Admin' ? name : email || name
    const parts = source
        .replace(/@.*/, '')
        .split(/[\s._-]+/)
        .filter(Boolean)

    const initials = parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`
        : (parts[0] || 'A').slice(0, 2)

    return initials.toUpperCase()
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const isAdmin = session?.user?.role === 'admin'

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50")}>
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Wird geladen...</p>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated' || (!isAdmin && session)) {
        return (
            <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50 px-4")}>
                <div className="w-full max-w-md p-10 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h1 className={cn(displayFont.className, "mb-3 text-2xl font-bold text-slate-900")}>Zugriff verweigert</h1>
                    <p className="mb-8 text-slate-500 text-sm">Dieser Bereich ist ausschließlich für Administratoren reserviert.</p>
                    <div className="space-y-3">
                        <Button onClick={() => router.push('/login')} className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
                            Zum Login
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold" onClick={() => router.push('/')}>
                            Zurück zur Webseite
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!session) return null

    const userName = getDisplayName(session)
    const userEmail = session.user?.email || ''
    const userInitials = getInitials(userName, userEmail)

    const navGroups = [
        {
            label: 'Verwaltung',
            items: [
                { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
                { name: 'Interessenten', href: '/admin/leads', icon: Users },
                { name: 'Teilnehmer', href: '/admin/participants', icon: UserRound },
            ],
        },
        {
            label: 'Akademie',
            items: [
                { name: 'Videokurse', href: '/admin/videos', icon: Video },
            ],
        },
    ]

    const navItems = navGroups.flatMap((group) => group.items)
    const pageTitle = navItems.find((item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)))?.name || 'Admin'

    return (
        <div className={cn(bodyFont.className, "flex h-screen overflow-hidden bg-[#f6f8fb] text-slate-900")}>

            {/* Desktop Sidebar */}
            <aside className="hidden w-[292px] shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
                <div className="flex h-[94px] items-center px-7">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h1 className={cn(displayFont.className, "text-[24px] font-bold tracking-tight text-slate-950")}>
                            MPU <span className="text-blue-600">Focus</span>
                        </h1>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {navGroups.map((group) => (
                        <div key={group.label} className="mb-8">
                            <div className="px-4 pb-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                            </div>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors",
                                                isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                                            )}
                                        >
                                            {isActive && <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />}
                                            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors", isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 group-hover:bg-white group-hover:text-slate-700")}>
                                                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                            </span>
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mx-6 border-t border-slate-200/80 py-6">
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
                            <div>
                                <p className="text-sm font-bold text-slate-950">Admin Workspace</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Geschützter Bereich</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <span className="text-sm font-bold text-blue-700">{userInitials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
                            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-red-600"
                            title="Abmelden"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex min-w-0 flex-1 flex-col bg-[#f6f8fb]">

                {/* Workspace Header */}
                <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/85 px-5 backdrop-blur-xl md:px-10 lg:px-11">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className={cn(displayFont.className, "text-xl font-bold text-slate-900")}>
                            MPU <span className="text-blue-600">Focus</span>
                        </h1>
                    </div>
                    <div className="hidden lg:block">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Admin Panel</p>
                        <p className={cn(displayFont.className, "mt-1 text-xl font-bold text-slate-950")}>{pageTitle}</p>
                    </div>
                    <div className="hidden items-center gap-3 lg:flex">
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            Live
                        </div>
                        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900" aria-label="Benachrichtigungen">
                            <Bell className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {/* Mobile Navigation Drawer */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                        <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                            <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100">
                                <Link href="/" className="font-bold text-xl tracking-tight text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>
                                    MPU <span className="text-blue-600">Focus</span>
                                </Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={cn(
                                                "group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all",
                                                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-700" : "text-slate-400")} />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                            <div className="p-4 border-t border-slate-100">
                                <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100">
                                        <span className="text-sm font-bold text-blue-700">{userInitials}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
                                        <p className="truncate text-xs text-slate-500">{userEmail}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-5 w-5 shrink-0" />
                                    Abmelden
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Content Area */}
                <div className="flex-1 overflow-y-auto px-5 py-8 md:px-10 md:py-10 lg:px-11 lg:py-10">
                    {children}
                </div>

            </div>
        </div>
    )
}
