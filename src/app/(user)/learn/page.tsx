'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type VideoItem = {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  category: string
  orderIndex: number
}

export default function LearnPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch('/api/videos', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load videos')
        }
        const list: VideoItem[] = payload?.videos || []
        setVideos(list)
        setActiveVideo(list[0] || null)
      } catch (err: any) {
        setError(err?.message || 'Failed to load videos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const grouped = useMemo(() => {
    return videos.reduce<Record<string, VideoItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [videos])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl bg-white border p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Learning Environment</h1>
          <p className="text-sm text-slate-600 mt-2">
            Stream your training content directly from the Supabase video library.
          </p>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-10 text-center text-slate-600">Loading videos...</CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && (
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>{activeVideo?.title || 'Select a lesson'}</CardTitle>
                <CardDescription>{activeVideo?.description || 'Choose a video from the library.'}</CardDescription>
              </CardHeader>
              <CardContent>
                {activeVideo ? (
                  <video
                    key={activeVideo.id}
                    controls
                    className="w-full rounded-lg bg-black"
                    poster={activeVideo.thumbnailUrl || undefined}
                    src={activeVideo.videoUrl}
                  />
                ) : (
                  <div className="text-sm text-slate-600">No videos are published yet.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Video Library</CardTitle>
                <CardDescription>{videos.length} published lesson(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <Badge variant="secondary">{category}</Badge>
                    <div className="space-y-2">
                      {items.map((video) => (
                        <Button
                          key={video.id}
                          type="button"
                          variant={activeVideo?.id === video.id ? 'default' : 'outline'}
                          className="w-full justify-start h-auto py-2"
                          onClick={() => setActiveVideo(video)}
                        >
                          <span className="truncate text-left">
                            {video.title}
                            {video.durationSeconds ? ` • ${Math.round(video.durationSeconds / 60)} min` : ''}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {!videos.length && <p className="text-sm text-slate-600">No videos available yet.</p>}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
