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
  }, [session, status, router])

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
                Willkommen, {session.user.firstName} {session.user.lastName}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
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
              Ihr MPU-Training Dashboard
            </h2>
            <p className="text-gray-600">
              Verfolgen Sie Ihren Fortschritt und laden Sie Ihre Dokumente hoch.
            </p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtfortschritt</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProgress.overallProgress}%</div>
                <Progress value={userProgress.overallProgress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {userProgress.completedVideos} von {userProgress.totalVideos} Videos abgeschlossen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kapitel</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userProgress.completedChapters}/{userProgress.totalChapters}
                </div>
                <p className="text-xs text-muted-foreground">
                  Kapitel abgeschlossen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Videos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userProgress.completedVideos}/{userProgress.totalVideos}
                </div>
                <p className="text-xs text-muted-foreground">
                  Videos angesehen
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Course and Documents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ihr Kurs</CardTitle>
                <CardDescription>
                  Setzen Sie Ihr MPU-Training fort
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">MPU Vorbereitung - Grundlagen</h4>
                      <p className="text-sm text-gray-600">Kapitel 4: Verkehrspsychologie</p>
                    </div>
                    <Button>Fortsetzen</Button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Nächstes Video: "Selbstreflexion und Verhalten"</p>
                    <p>Geschätzte Zeit: 15 Minuten</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle>Dokumente</CardTitle>
                <CardDescription>
                  Laden Sie Ihre MPU-relevanten Dokumente hoch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Ziehen Sie PDF-Dateien hierher oder klicken Sie zum Auswählen
                    </p>
                    <Button variant="outline">
                      Dateien auswählen
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Hochgeladene Dokumente: 2</p>
                    <p>Status: Warten auf Überprüfung</p>
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