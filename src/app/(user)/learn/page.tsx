'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

interface ModuleGroup {
  key: string
  label: string
  chapters: Array<{ _id: string }>
}

export default function LearnHomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()
  const [modules, setModules] = useState<ModuleGroup[]>([])
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
    // verify user account status
    ;(async () => {
      try {
        const detailsRes = await fetch('/api/user/details')
        const details = detailsRes.ok ? await detailsRes.json() : null
        if (!details?.user || details.user.verificationStatus !== 'verified') {
          router.push('/dashboard')
          return
        }
        const courseRes = await fetch('/api/course')
        if (courseRes.ok) {
          const data = await courseRes.json()
          setModules(data.modules || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-40 md:h-56 bg-[url('/hero.jpg')] bg-cover bg-center flex items-center justify-center">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow">ON MPU Campus</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Meine Kurse</h2>

        <div className="space-y-6">
          {modules.map((group) => (
            <Card key={group.key} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{group.label}</CardTitle>
                  <CardDescription>
                    {t('watchVideosAndTrack')}
                  </CardDescription>
                </div>
                <Button onClick={() => router.push(`/learn/${group.key}`)} className="bg-green-500 hover:bg-green-600">
                  Kurs starten
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <BookOpen className="h-4 w-4" />
                  <span>{group.chapters.length} Module</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}