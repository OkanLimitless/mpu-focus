'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, LogOut, Plus, Eye, Clock, Play, Settings, BarChart3, UserCheck, Video, MessageSquare, Shield, FileCheck, Loader2 } from 'lucide-react'
import { PageHeader, KpiCard, StatGrid, EmptyState } from '@/components/ui'
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
  const searchParams = useSearchParams()
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

  // Sync active section with URL query (?section=...)
  useEffect(() => {
    const section = (searchParams.get('section') || 'dashboard') as AdminSection
    if (section !== activeSection) setActiveSection(section)
  }, [searchParams, activeSection])

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
            <PageHeader
              title={t('adminOverviewTitle')}
              description={t('adminOverviewDesc')}
              actions={(
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary">New User</Button>
                  <Button size="sm" variant="outline">Import Leads</Button>
                  <Button size="sm" variant="secondary">Add Module</Button>
                </div>
              )}
            />

            <StatGrid>
              <KpiCard label={t('totalUsers')} value={loading ? '—' : stats.totalUsers} subtext={t('registeredUsers')} icon={<Users className="h-4 w-4" />} />
              <KpiCard label={t('activeUsers')} value={loading ? '—' : stats.activeUsers} subtext={t('recentlyActive')} icon={<Users className="h-4 w-4" />} />
              <KpiCard label={t('newLeads')} value={loading ? '—' : stats.newLeads} subtext={t('nav_leads_desc')} icon={<UserCheck className="h-4 w-4" />} />
              <KpiCard label={t('verificationManagement')} value={loading ? '—' : stats.pendingRequests} subtext={t('nav_verification_desc')} icon={<FileCheck className="h-4 w-4" />} />
            </StatGrid>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Review progress, edit roles, and manage enrollments.</p>
                  <Button onClick={() => setActiveSection('users')}>Manage users</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState title="No recent activity" description="Recent verifications, new users, and imported leads will appear here." />
                </CardContent>
              </Card>
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
    <>{renderDashboardContent()}</>
  )
}