'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Upload, FileText, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userProgress, setUserProgress] = useState({
    totalChapters: 0,
    completedChapters: 0,
    totalVideos: 0,
    completedVideos: 0,
    overallProgress: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role === 'admin') {
      router.push('/admin')
      return
    }

    // Load user progress
    fetchUserProgress()
  }, [session, status, router])

  const fetchUserProgress = async () => {
    try {
      const response = await fetch('/api/user-progress')
      if (response.ok) {
        const data = await response.json()
        console.log('User progress data:', data.progress) // Debug log
        setUserProgress(data.progress)
      } else {
        console.error('Failed to fetch user progress:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
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

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MPU-Focus</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user.firstName} {session.user.lastName}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Your Training Dashboard
            </h2>
            <p className="text-gray-600">
              Track your progress and access your course materials.
            </p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : userProgress.overallProgress}%</div>
                <Progress value={userProgress.overallProgress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Course completion progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chapters</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : `${userProgress.completedChapters}/${userProgress.totalChapters}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Chapters completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Course and Documents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Section */}
            <Card>
              <CardHeader>
                <CardTitle>Your Course</CardTitle>
                <CardDescription>
                  Continue your training progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Training Course</h4>
                          <p className="text-sm text-gray-600">Continue your learning journey</p>
                        </div>
                        <Button onClick={() => router.push('/course')}>Continue</Button>
                      </div>
                      
                                              <div className="text-sm text-gray-600">
                          <p>Watch videos, track your progress, and complete your training</p>
                        </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Upload your training-relevant documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag PDF files here or click to select
                    </p>
                    <Button variant="outline">
                      Select Files
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Uploaded Documents: {loading ? '...' : '2'}</p>
                    <p>Status: {loading ? '...' : 'Awaiting Review'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}