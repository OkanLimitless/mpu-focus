'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RestrictedMuxVideoPlayer from '@/components/video/RestrictedMuxVideoPlayer'
import { ArrowLeft, ArrowRight, CheckCircle, PlayCircle, BookOpen } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface VideoData {
  _id: string
  title: string
  description: string
  duration: number
  order: number
  muxPlaybackId?: string
  status: string
  isAccessible: boolean
  progress: {
    currentTime: number
    watchedDuration: number
    isCompleted: boolean
    completionPercentage: number
  } | null
}

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
  videos: VideoData[]
}

export default function ModulePage() {
  const { category, moduleId } = useParams<{ category: string; moduleId: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [moduleData, setModuleData] = useState<ChapterData | null>(null)
  const [selected, setSelected] = useState<VideoData | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if (session.user.role === 'admin') { router.push('/admin'); return }
    ;(async () => {
      const details = await fetch('/api/user/details')
      const d = details.ok ? await details.json() : null
      if (!d?.user || d.user.verificationStatus !== 'verified') { router.push('/dashboard'); return }
      const res = await fetch('/api/course')
      if (!res.ok) return
      const data = await res.json()
      const group = (data.modules || []).find((m: any) => m.key === category)
      const mod = group?.chapters?.find((c: any) => c._id === moduleId) || null
      setModuleData(mod)
      if (mod && mod.videos && mod.videos.length > 0) {
        const first = mod.videos.find((v: any) => v.isAccessible && !v.progress?.isCompleted) || mod.videos[0]
        setSelected(first)
      }
    })()
  }, [session, status, router, category, moduleId])

  const nextVideo = useMemo(() => {
    if (!moduleData || !selected) return null
    const idx = moduleData.videos.findIndex(v => v._id === selected._id)
    return idx >= 0 && idx < moduleData.videos.length - 1 ? moduleData.videos[idx + 1] : null
  }, [moduleData, selected])

  const prevVideo = useMemo(() => {
    if (!moduleData || !selected) return null
    const idx = moduleData.videos.findIndex(v => v._id === selected._id)
    return idx > 0 ? moduleData.videos[idx - 1] : null
  }, [moduleData, selected])

  const totals = useMemo(() => {
    if (!moduleData) return { total: 0, done: 0, pct: 0 }
    const total = moduleData.videos.length
    const done = moduleData.videos.filter(v => v.progress?.isCompleted).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, pct }
  }, [moduleData])

  if (!moduleData) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 truncate">MPU Focus Campus / <span className="capitalize">{category}</span></div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{moduleData.title}</h1>
            <div className="mt-2 hidden md:flex items-center gap-2 text-sm text-gray-600">
              <div className="w-48"><Progress value={totals.pct} /></div>
              <span>{totals.done}/{totals.total} Lektionen</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push(`/learn/${category}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player and lessons */}
        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <Card className="overflow-hidden">
              <RestrictedMuxVideoPlayer
                video={{
                  _id: selected._id,
                  title: selected.title,
                  description: selected.description,
                  muxPlaybackId: selected.muxPlaybackId,
                  duration: selected.duration,
                  chapterId: moduleData._id,
                  courseId: undefined,
                }}
                userProgress={selected.progress ? {
                  currentTime: selected.progress.currentTime,
                  watchedDuration: selected.progress.watchedDuration,
                  isCompleted: selected.progress.isCompleted,
                  completionPercentage: selected.progress.completionPercentage
                } : undefined}
                onVideoComplete={() => {}}
                onProgressUpdate={() => {}}
              />
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={!prevVideo} onClick={() => prevVideo && setSelected(prevVideo)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
            </Button>
            <Button disabled={!nextVideo} onClick={() => nextVideo && setSelected(nextVideo)}>
              Weiter <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lektionen</CardTitle>
              <CardDescription>Wähle eine Lektion aus oder nutze Weiter/Zurück.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {moduleData.videos.map(v => (
                  <button key={v._id} className={`w-full text-left py-3 flex items-center justify-between ${selected?._id === v._id ? 'bg-blue-50 px-3 rounded' : ''}`} onClick={() => setSelected(v)} disabled={!v.isAccessible}>
                    <div className="flex items-center gap-3 min-w-0">
                      {v.progress?.isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.title}</div>
                        <div className="text-xs text-gray-500 truncate">{v.description}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{Math.floor(v.duration / 60)}:{String(Math.floor(v.duration % 60)).padStart(2, '0')}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky summary card */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Modulfortschritt</CardTitle>
                <CardDescription>{totals.done}/{totals.total} Lektionen abgeschlossen</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={totals.pct} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modulbeschreibung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{moduleData.description}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}