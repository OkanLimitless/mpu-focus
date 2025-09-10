'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

type VideoProgress = {
  isCompleted?: boolean
}

type Video = {
  _id: string
  title?: string
  duration?: number
  progress?: VideoProgress | null
}

type Chapter = {
  _id: string
  title?: string
  order: number
  videos: Video[]
}

type ModuleGroup = {
  key: string
  label: string
  chapters: Chapter[]
}

export default function LearnHomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()
  const [modules, setModules] = useState<ModuleGroup[]>([])
  const [userProgress, setUserProgress] = useState<{ currentChapterOrder: number } | null>(null)
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
          setUserProgress(data.userProgress || null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [session, status, router])

  const continueTarget = useMemo<{ key: string; chapterId: string } | null>(() => {
    if (!modules.length || !userProgress) return null
    const currentOrder = userProgress.currentChapterOrder
    let target: { key: string; chapterId: string } | null = null
    modules.forEach(group => {
      group.chapters.forEach(ch => {
        if (!target && ch.order === currentOrder) {
          target = { key: group.key, chapterId: ch._id }
        }
      })
    })
    return target
  }, [modules, userProgress])

  const nextSteps = useMemo(() => {
    // Find next 1-2 videos based on current chapter order
    if (!modules.length || !userProgress) return [] as Array<{ title: string; moduleKey: string; chapterId: string; duration?: number }>
    const currentOrder = userProgress.currentChapterOrder
    const items: Array<{ title: string; moduleKey: string; chapterId: string; duration?: number }> = []
    modules.forEach(group => {
      group.chapters.forEach(ch => {
        if (ch.order === currentOrder) {
          const nextVideo = ch.videos.find(v => !v.progress?.isCompleted)
          if (nextVideo) {
            items.push({ title: nextVideo.title || 'Nächste Lektion', moduleKey: group.key, chapterId: ch._id, duration: nextVideo.duration })
          }
        }
      })
    })
    return items.slice(0, 2)
  }, [modules, userProgress])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-40 md:h-56 bg-gray-800 flex items-center justify-center">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white">{t('campusTitle')}</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {continueTarget && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-green-700 font-medium">{t('continueWhereLeftOff')}</div>
                <div className="text-xs text-green-700/80">{t('resumeCourse')}</div>
              </div>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push(`/learn/${continueTarget.key}/${continueTarget.chapterId}`)}>
                {t('resume')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Next steps */}
        {nextSteps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('nextSteps')}</CardTitle>
              <CardDescription>{t('nextStepsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {nextSteps.map((step, idx) => (
                  <Button key={idx} variant="outline" onClick={() => router.push(`/learn/${step.moduleKey}/${step.chapterId}`)}>
                    {t('continueInModule')}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-2xl md:text-3xl font-bold">{t('yourCourse')}</h2>

        <div className="space-y-6">
          {modules.map((group) => {
            const hasProgress = group.chapters.some(ch => ch.videos.some(v => v.progress?.isCompleted))
            return (
              <Card key={group.key} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{group.label}</CardTitle>
                    <CardDescription>
                      {t('watchVideosAndTrack')}
                    </CardDescription>
                  </div>
                  <Button onClick={() => router.push(`/learn/${group.key}`)} className="bg-green-500 hover:bg-green-600">
                    {hasProgress ? t('resume') : t('startCourse')}
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4" />
                    <span>{t('modulesCount', { count: group.chapters.length })}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Course Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Kurskarte</CardTitle>
            <CardDescription>Überblick über Module und Kapitel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((group) => (
                <div key={group.key} className="border rounded-lg p-3">
                  <div className="font-semibold mb-2">{group.label}</div>
                  <div className="space-y-1 text-sm">
                    {group.chapters.map((ch) => (
                      <button key={ch._id} onClick={() => router.push(`/learn/${group.key}/${ch._id}`)} className="block w-full text-left p-2 rounded hover:bg-gray-50">
                        {ch.order}. {ch.title || ch._id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
