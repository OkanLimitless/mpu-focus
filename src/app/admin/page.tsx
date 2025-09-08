'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, LogOut, Plus, Eye, Clock, Play, Settings, BarChart3, UserCheck, Video, MessageSquare, Shield, FileCheck, Loader2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/providers/i18n-provider'

// Dynamic imports for admin components to prevent SSR issues
const UserManagement = dynamic(() => import('@/components/admin/UserManagement'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

const VideoManagement = dynamic(() => import('@/components/admin/VideoManagement'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

const ChapterManagement = dynamic(() => import('@/components/admin/ChapterManagement'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

const LeadManagement = dynamic(() => import('@/components/admin/LeadManagement'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

const VerificationManagement = dynamic(() => import('@/components/admin/VerificationManagement'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

type AdminSection = 'dashboard' | 'users' | 'leads' | 'verification' | 'chapters' | 'videos'

const navigationItems = [
  {
    id: 'dashboard' as AdminSection,
    nameKey: 'nav_dashboard',
    icon: BarChart3,
    descriptionKey: 'nav_dashboard_desc'
  },
  {
    id: 'users' as AdminSection,
    nameKey: 'nav_users',
    icon: Users,
    descriptionKey: 'nav_users_desc'
  },
  {
    id: 'leads' as AdminSection,
    nameKey: 'nav_leads',
    icon: UserCheck,
    descriptionKey: 'nav_leads_desc'
  },
  {
    id: 'verification' as AdminSection,
    nameKey: 'nav_verification',
    icon: FileCheck,
    descriptionKey: 'nav_verification_desc'
  },
  {
    id: 'chapters' as AdminSection,
    nameKey: 'nav_chapters',
    icon: BookOpen,
    descriptionKey: 'nav_chapters_desc'
  },
  {
    id: 'videos' as AdminSection,
    nameKey: 'nav_videos',
    icon: Video,
    descriptionKey: 'nav_videos_desc'
  }
]

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    pendingRequests: 0,
    completedVideos: 0,
    averageProgress: 0,
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    convertedLeads: 0
  })
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // Load dashboard stats
    fetchDashboardStats()
  }, [session, status, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  const renderDashboardContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">{t('registeredUsers')}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('activeUsers')}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">{t('recentlyActive')}</p>
                </CardContent>
              </Card>

              {/* Removed: Course Chapters and Avg Progress cards */}
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('users')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    {t('nav_users')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{loading ? '...' : stats.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">{t('nav_users_desc')}</p>
                  <Button className="mt-3 w-full" variant="outline">
                    {t('manageUsers')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('leads')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCheck className="h-5 w-5 text-green-500" />
                    {t('newLeads')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{loading ? '...' : stats.newLeads}</div>
                  <p className="text-sm text-muted-foreground">{t('nav_leads_desc')}</p>
                  <Button className="mt-3 w-full" variant="outline">
                    {t('nav_leads')}
                  </Button>
                </CardContent>
              </Card>

              {/* Removed: Videos Completed action card */}
            </div>
          </div>
        )
      case 'users':
        return <UserManagement />
      case 'leads':
        return <LeadManagement />
      case 'verification':
        return <VerificationManagement />
      case 'chapters':
        return <ChapterManagement />
      case 'videos':
        return <VideoManagement />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex w-72 bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-xl border-r flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MPU-Focus</h1>
              <p className="text-sm text-gray-500">{t('adminPanel')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group",
                    activeSection === item.id
                      ? "bg-blue-600 text-white shadow-sm border border-blue-600"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors flex-shrink-0",
                    activeSection === item.id ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <div className={"flex-1 min-w-0"}>
                    <div className="font-medium">{t(item.nameKey)}</div>
                    <div className={cn("text-xs truncate", activeSection === item.id ? "text-white/80" : "text-gray-500")}>{t(item.descriptionKey)}</div>
                  </div>
                  {(item.id === 'leads' && stats.newLeads > 0) && (
                    <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur">
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {session.user.firstName} {session.user.lastName}
              </div>
              <div className="text-gray-500">Administrator</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-sm border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {t(navigationItems.find(item => item.id === activeSection)?.nameKey || 'nav_dashboard')}
              </h1>
              <p className="text-sm lg:text-base text-gray-600 truncate">
                {t(navigationItems.find(item => item.id === activeSection)?.descriptionKey || 'nav_dashboard_desc')}
              </p>
            </div>
            
            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as AdminSection)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                {navigationItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(item.nameKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              {stats.newLeads > 0 && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setActiveSection('leads')}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {stats.newLeads} {t('newLeads')}
                </Button>
              )}
            </div>
          </div>

          {/* Mobile User Info & Action Buttons */}
          <div className="lg:hidden mt-4 pt-4 border-t flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {session.user.firstName} {session.user.lastName}
              </div>
              <div className="text-gray-500">Administrator</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>

          {/* Mobile Action Buttons */}
          <div className="lg:hidden mt-4 flex gap-2">
            {stats.newLeads > 0 && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={() => setActiveSection('leads')}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {stats.newLeads} {t('newLeads')}
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 pb-24 lg:pb-8 lg:p-8 overflow-auto">
          {renderDashboardContent()}
        </main>
        {/* Mobile bottom nav */}
        <nav className="lg:hidden sticky bottom-0 inset-x-0 bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-t shadow-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid grid-cols-3">
            {(['dashboard','users','leads'] as AdminSection[]).map((id) => {
              const item = navigationItems.find(i => i.id === id)!
              const Icon = item.icon
              const isActive = activeSection === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={cn('py-3 text-xs flex flex-col items-center justify-center', isActive ? 'text-blue-600' : 'text-gray-600')}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-1">{t(item.nameKey)}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}