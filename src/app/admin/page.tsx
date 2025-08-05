'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, LogOut, Plus, Eye } from 'lucide-react'
import { signOut } from 'next-auth/react'
import UserRequestsManagement from '@/components/admin/UserRequestsManagement'

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 45,
    activeUsers: 38,
    totalCourses: 3,
    totalDocuments: 127,
    pendingDocuments: 23,
    completionRate: 68
  })

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

  if (!session || session.user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MPU-Focus Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.firstName} {session.user.lastName} (Admin)
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
              Admin Dashboard
            </h2>
            <p className="text-gray-600">
              Verwalten Sie Benutzer, Kurse und überprüfen Sie Dokumente.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamt Benutzer</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktive Benutzer</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kurse</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dokumente</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingDocuments}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Abschlussrate</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Management Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle>Benutzerverwaltung</CardTitle>
                <CardDescription>
                  Erstellen und verwalten Sie Benutzerkonten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Neuen Benutzer erstellen
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Alle Benutzer anzeigen
                  </Button>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Kürzlich erstellt: 3</p>
                    <p>Inaktive Benutzer: 7</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Management */}
            <Card>
              <CardHeader>
                <CardTitle>Kursverwaltung</CardTitle>
                <CardDescription>
                  Verwalten Sie Kurse, Kapitel und Videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Neuen Kurs erstellen
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Kurse verwalten
                  </Button>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Aktive Kurse: {stats.totalCourses}</p>
                    <p>Gesamt Kapitel: 24</p>
                    <p>Gesamt Videos: 156</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Review */}
            <Card>
              <CardHeader>
                <CardTitle>Dokumentenprüfung</CardTitle>
                <CardDescription>
                  Überprüfen Sie hochgeladene Benutzerdokumente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Ausstehende Dokumente ({stats.pendingDocuments})
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Alle Dokumente
                  </Button>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Heute eingegangen: 5</p>
                    <p>Diese Woche: 18</p>
                    <p>Durchschnittliche Bearbeitungszeit: 2.3 Tage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Access Requests */}
          <div className="mt-8">
            <UserRequestsManagement />
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Kürzliche Aktivitäten</CardTitle>
                <CardDescription>
                  Überblick über die neuesten Systemaktivitäten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Neuer Benutzer registriert</p>
                      <p className="text-sm text-gray-600">Max Mustermann - vor 2 Stunden</p>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Dokument hochgeladen</p>
                      <p className="text-sm text-gray-600">Anna Schmidt - Führerscheinentzug.pdf - vor 4 Stunden</p>
                    </div>
                    <Button variant="outline" size="sm">Überprüfen</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Kurs abgeschlossen</p>
                      <p className="text-sm text-gray-600">Peter Weber - MPU Grundlagen - vor 1 Tag</p>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
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