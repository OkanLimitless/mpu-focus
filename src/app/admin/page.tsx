'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, LogOut, Plus, Eye, Clock, Play, Settings, BarChart3, UserCheck, Video, MessageSquare, Shield, FileCheck } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import UserManagement from '@/components/admin/UserManagement'
import VideoManagement from '@/components/admin/VideoManagement'
import ChapterManagement from '@/components/admin/ChapterManagement'
import LeadManagement from '@/components/admin/LeadManagement'
import VerificationManagement from '@/components/admin/VerificationManagement'

type AdminSection = 'dashboard' | 'users' | 'leads' | 'verification' | 'chapters' | 'videos'

const navigationItems = [
  {
    id: 'dashboard' as AdminSection,
    name: 'Dashboard',
    icon: BarChart3,
    description: 'Overview and statistics'
  },
  {
    id: 'users' as AdminSection,
    name: 'User Management',
    icon: Users,
    description: 'Manage users and track progress'
  },
  {
    id: 'leads' as AdminSection,
    name: 'Lead Management',
    icon: UserCheck,
    description: 'Manage and convert leads'
  },
  {
    id: 'verification' as AdminSection,
    name: 'Verification',
    icon: FileCheck,
    description: 'Review user verification submissions'
  },
  {
    id: 'chapters' as AdminSection,
    name: 'Chapters',
    icon: BookOpen,
    description: 'Manage course chapters'
  },
  {
    id: 'videos' as AdminSection,
    name: 'Videos',
    icon: Video,
    description: 'Manage course videos'
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
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
              <p className="text-gray-600">Welcome to the admin dashboard. Here's a quick overview of your system.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Recently active</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Course Chapters</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.totalCourses}</div>
                  <p className="text-xs text-muted-foreground">Available chapters</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">User completion</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('users')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{loading ? '...' : stats.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">Manage all users and track their progress</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('leads')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCheck className="h-5 w-5 text-green-500" />
                    New Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{loading ? '...' : stats.newLeads}</div>
                  <p className="text-sm text-muted-foreground">Fresh leads to contact and convert</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Manage Leads
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveSection('videos')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Play className="h-5 w-5 text-purple-500" />
                    Videos Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{loading ? '...' : stats.completedVideos}</div>
                  <p className="text-sm text-muted-foreground">Total video completions</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Manage Videos
                  </Button>
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex w-64 bg-white shadow-lg border-r flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MPU-Focus</h1>
              <p className="text-sm text-gray-500">Admin Panel</p>
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
                      ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors flex-shrink-0",
                    activeSection === item.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                  {(item.id === 'leads' && stats.newLeads > 0) && (
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t bg-white">
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
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {navigationItems.find(item => item.id === activeSection)?.name || 'Dashboard'}
              </h1>
              <p className="text-sm lg:text-base text-gray-600 truncate">
                {navigationItems.find(item => item.id === activeSection)?.description || 'Admin dashboard overview'}
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
                    {item.name}
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
                  {stats.newLeads} New Leads
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
              Logout
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
                {stats.newLeads} New Leads
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {renderDashboardContent()}
        </main>
      </div>
    </div>
  )
}