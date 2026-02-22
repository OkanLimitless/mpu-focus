'use client'

import { useEffect, useMemo, useState } from 'react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  Clock3,
  Layers,
  PlayCircle,
  Search,
  Sparkles,
  Video,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'n/a'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default function LearnPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch('/api/videos', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load videos')
        }

        const list: VideoItem[] = payload?.videos || []
        setVideos(list)
        setActiveVideoId(list[0]?.id || null)
      } catch (err: any) {
        setError(err?.message || 'Failed to load videos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const categories = useMemo(() => {
    return Array.from(new Set(videos.map((item) => item.category))).sort((a, b) => a.localeCompare(b))
  }, [videos])

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase()
    return videos.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      if (!matchesCategory) return false

      if (!query) return true
      return (
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      )
    })
  }, [videos, search, selectedCategory])

  const grouped = useMemo(() => {
    return filteredVideos.reduce<Record<string, VideoItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [filteredVideos])

  const activeVideo = useMemo(() => {
    return videos.find((item) => item.id === activeVideoId) || null
  }, [videos, activeVideoId])

  useEffect(() => {
    if (!filteredVideos.length) return
    const hasActiveVideoInFiltered = filteredVideos.some((item) => item.id === activeVideoId)
    if (!hasActiveVideoInFiltered) {
      setActiveVideoId(filteredVideos[0].id)
    }
  }, [filteredVideos, activeVideoId])

  const totalDurationMins = useMemo(() => {
    const totalSeconds = videos.reduce((acc, item) => acc + (item.durationSeconds || 0), 0)
    return Math.round(totalSeconds / 60)
  }, [videos])

  return (
    <div className={`${bodyFont.className} min-h-screen bg-[#edf2f8] text-slate-900`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-100 blur-3xl" />
        <div className="absolute -right-16 top-12 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-6 md:py-10">
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-6 text-white shadow-2xl md:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs tracking-wide">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Learning Environment
              </p>
              <h1 className={`${displayFont.className} text-3xl leading-tight md:text-5xl`}>
                Structured Video Learning, Built for Focus
              </h1>
              <p className="mt-3 text-cyan-50/95">
                Browse all published lessons, filter by category, and continue training from one clean interface.
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[340px]">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-xs text-cyan-100">Videos</p>
                <p className={`${displayFont.className} text-2xl`}>{videos.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-xs text-cyan-100">Categories</p>
                <p className={`${displayFont.className} text-2xl`}>{categories.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center">
                <p className="text-xs text-cyan-100">Duration</p>
                <p className={`${displayFont.className} text-2xl`}>{totalDurationMins || 0}m</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_240px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lessons"
                className="h-11 rounded-xl border-slate-300 pl-9"
              />
            </div>
            <select
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-slate-300"
              onClick={() => {
                setSearch('')
                setSelectedCategory('all')
              }}
            >
              Reset
            </Button>
          </div>
        </section>

        {loading && (
          <Card className="mt-4 rounded-2xl border-slate-200">
            <CardContent className="py-14 text-center text-slate-600">Loading videos...</CardContent>
          </Card>
        )}

        {error && (
          <Card className="mt-4 rounded-2xl border-red-200 bg-red-50">
            <CardContent className="py-10 text-center text-red-700">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && (
          <section className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.95fr] lg:items-start">
            <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 bg-slate-900 px-5 py-4 text-white md:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`${displayFont.className} text-2xl`}>{activeVideo?.title || 'Select a lesson'}</h2>
                    {activeVideo && (
                      <Badge className="border-white/30 bg-white/10 text-white">{activeVideo.category}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {activeVideo?.description || 'Pick a lesson from the curriculum panel.'}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 md:p-4">
                  {activeVideo ? (
                    <video
                      key={activeVideo.id}
                      controls
                      playsInline
                      className="w-full rounded-2xl bg-black"
                      poster={activeVideo.thumbnailUrl || undefined}
                      src={activeVideo.videoUrl}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-300">
                      No lesson selected.
                    </div>
                  )}
                </div>

                {activeVideo && (
                  <div className="flex flex-wrap gap-2 p-4 md:p-5">
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                      <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                      {formatDuration(activeVideo.durationSeconds)}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Order {activeVideo.orderIndex}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                      <Video className="mr-1.5 h-3.5 w-3.5" />
                      Active lesson
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className={`${displayFont.className} text-2xl`}>Curriculum</h3>
                  <Badge variant="outline">{filteredVideos.length} results</Badge>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold uppercase tracking-wide text-slate-700">{category}</p>
                        <Badge className="bg-white text-slate-700 border-slate-200">{items.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((video) => {
                          const isActive = activeVideoId === video.id
                          return (
                            <Button
                              key={video.id}
                              type="button"
                              variant="outline"
                              onClick={() => setActiveVideoId(video.id)}
                              className={cn(
                                'h-auto w-full justify-start rounded-xl border p-3 text-left',
                                isActive
                                  ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white'
                                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100',
                              )}
                            >
                              <span className="flex w-full items-start gap-3">
                                <PlayCircle className={cn('mt-0.5 h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-blue-700')} />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{video.title}</span>
                                  <span className={cn('mt-0.5 block text-xs', isActive ? 'text-blue-100' : 'text-slate-500')}>
                                    {formatDuration(video.durationSeconds)}
                                  </span>
                                </span>
                              </span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {!filteredVideos.length && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                      No lessons match your filters.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}
