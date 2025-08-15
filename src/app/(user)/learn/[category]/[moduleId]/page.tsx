'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RestrictedMuxVideoPlayer from '@/components/video/RestrictedMuxVideoPlayer'
import { ArrowLeft, ArrowRight, CheckCircle, PlayCircle } from 'lucide-react'

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

  if (!moduleData) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => router.push(`/learn/${category}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-4">{moduleData.title}</h1>

        {selected && (
          <Card className="mb-6">
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
              onVideoComplete={() => { /* handled by backend hooks; will refresh on next load */ }}
              onProgressUpdate={() => { /* optional */ }}
            />
          </Card>
        )}

        <div className="flex items-center justify-between mb-6">
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
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {moduleData.videos.map(v => (
                <button key={v._id} className={`w-full text-left py-3 flex items-center justify-between ${selected?._id === v._id ? 'bg-blue-50 px-3 rounded' : ''}`} onClick={() => setSelected(v)} disabled={!v.isAccessible}>
                  <div className="flex items-center gap-3">
                    {v.progress?.isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="font-medium">{v.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-1">{v.description}</div>
                    </div>
                  </div>
                  {!v.isAccessible && <span className="text-xs text-gray-400">Gesperrt</span>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}