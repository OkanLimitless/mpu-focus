'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import { LayoutDashboard, Users, Video, Settings, LogOut, Menu, X, Bell, Search, Lock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })

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

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Leads & CRM', href: '/admin/leads', icon: Users },
        { name: 'Videokurse', href: '/admin/videos', icon: Video },
        { name: 'Einstellungen', href: '/admin/settings', icon: Settings },
    ]

    return (
        <div className={cn(bodyFont.className, "flex h-screen bg-slate-50 text-slate-900 overflow-hidden")}>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-slate-200 z-20">
                <div className="flex h-20 items-center px-8 border-b border-slate-100">
                    <Link href="/" className="flex items-center gap-2">
                        <h1 className={cn(displayFont.className, "text-2xl font-bold tracking-tight text-slate-900")}>
                            MPU <span className="text-blue-600">Focus</span>
                        </h1>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 mt-4">
                    <div className="px-4 mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Verwaltung</p>
                    </div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600")} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                            <span className="text-sm font-bold text-blue-700">OK</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-slate-900">Admin</p>
                            <p className="text-xs text-slate-500 truncate">admin@mpu-focus.de</p>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Abmelden"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">

                {/* Top Header */}
                <header className="h-20 flex items-center justify-between px-6 lg:px-10 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 sticky top-0">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className={cn(displayFont.className, "text-xl font-bold text-slate-900")}>
                            MPU <span className="text-blue-600">Focus</span>
                        </h1>
                    </div>

                    <div className="hidden lg:flex items-center max-w-md w-full relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Global suchen (Cmd+K)"
                            className="w-full bg-slate-100/50 border-slate-200 pl-10 h-11 rounded-xl focus-visible:ring-blue-500 shadow-none font-medium text-slate-700"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white" />
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
                <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
                    {children}
                </div>

            </div>
        </div>
    )
}
