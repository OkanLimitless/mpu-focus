'use client'

import { useEffect, useMemo, useState } from 'react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import { useI18n } from '@/components/providers/i18n-provider'
import {
  PlayCircle,
  Clock,
  ChevronRight,
  CheckCircle2,
  Layout,
  BookOpen,
  ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
  const { t } = useI18n()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null)

  useEffect(() => {
    ; (async () => {
      try {
        const response = await fetch('/api/videos', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Fehler beim Laden der Videos')
        }
        const list: VideoItem[] = payload?.videos || []
        // Sort by orderIndex
        const sorted = list.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        setVideos(sorted)
        setActiveVideo(sorted[0] || null)
      } catch (err: any) {
        setError(err?.message || 'Fehler beim Laden der Videos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const grouped = useMemo(() => {
    return videos.reduce<Record<string, VideoItem[]>>((acc, item) => {
      const cat = item.category || 'Allgemein'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [videos])

  if (loading) {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50")}>
        <div className="flex flex-col items-center gap-4 text-slate-800">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-lg font-medium">Lernakademie lädt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, "min-h-screen bg-slate-50 text-slate-900")}>
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl border-slate-200 hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className={cn(displayFont.className, "text-xl font-bold md:text-2xl")}>
                MPU-Focus <span className="text-primary">Lernakademie</span>
              </h1>
              <p className="hidden text-xs font-medium text-slate-500 md:block">
                Ihr professioneller Weg zur erfolgreichen MPU
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden border-emerald-200 bg-emerald-50 text-emerald-700 md:inline-flex px-3 py-1">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Eingeschrieben
            </Badge>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/20" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 lg:py-10">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl text-red-600">!</span>
            </div>
            <h2 className="text-xl font-bold">Hoppla! Es gab ein Problem.</h2>
            <p className="text-slate-500">{error}</p>
            <Button className="mt-6 rounded-xl bg-primary" onClick={() => window.location.reload()}>Erneut versuchen</Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Main Content (Video Player) */}
            <div className="space-y-6">
              <div className="group relative aspect-video overflow-hidden rounded-[2rem] bg-black shadow-2xl ring-1 ring-slate-200 transition-all">
                {activeVideo ? (
                  <video
                    key={activeVideo.id}
                    controls
                    className="h-full w-full"
                    poster={activeVideo.thumbnailUrl || undefined}
                    src={activeVideo.videoUrl}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900 text-white">
                    <PlayCircle className="h-16 w-16 opacity-20" />
                    <p className="text-slate-400">Wählen Sie eine Lektion aus der Liste rechts.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 font-bold">
                      {activeVideo?.category || 'Lektion'}
                    </Badge>
                    <h2 className={cn(displayFont.className, "text-2xl font-bold text-slate-900 md:text-3xl")}>
                      {activeVideo?.title || 'Lektion auswählen'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Clock className="h-4 w-4" />
                      {formatDuration(activeVideo?.durationSeconds)}
                    </span>
                  </div>
                </div>
                <div className="h-px w-full bg-slate-100" />
                <p className="text-lg leading-relaxed text-slate-600">
                  {activeVideo?.description || 'Wählen Sie eine Lektion, um mit dem Lernen zu beginnen.'}
                </p>
              </div>
            </div>

            {/* Sidebar (List) */}
            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Kursübersicht</h3>
                    <p className="text-xs font-medium text-slate-500">{videos.length} Lektionen verfügbar</p>
                  </div>
                </div>
              </section>

              <div className="space-y-8 h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="flex items-center px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <Layout className="mr-2 h-3.5 w-3.5" />
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {items.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => setActiveVideo(video)}
                          className={cn(
                            "group flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-all",
                            activeVideo?.id === video.id
                              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-primary/30 hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
                            activeVideo?.id === video.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            {video.orderIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h5 className="truncate text-sm font-bold leading-tight">{video.title}</h5>
                            <div className={cn(
                              "flex items-center gap-3 text-[10px] font-bold",
                              activeVideo?.id === video.id ? "text-white/70" : "text-slate-400"
                            )}>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(video.durationSeconds)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "h-5 w-5 shrink-0 self-center transition-transform group-hover:translate-x-1",
                            activeVideo?.id === video.id ? "text-white/50" : "text-slate-300"
                          )} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {!videos.length && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <PlayCircle className="mb-3 h-10 w-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500 italic">Noch keine Inhalte verfügbar.</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  )
}
