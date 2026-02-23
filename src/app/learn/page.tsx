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
  ArrowLeft,
  Share2,
  Bookmark,
  MoreVertical,
  Maximize2
} from 'lucide-react'
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
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-premium-dark text-white")}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-primary/20 bg-slate-900/50 backdrop-blur-xl">
              <PlayCircle className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>
          <p className={cn(displayFont.className, "text-xl font-medium tracking-widest uppercase opacity-50")}>Masterclass lädt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, "min-h-screen bg-premium-dark text-slate-200 selection:bg-primary selection:text-white")}>
      {/* Cinematic Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {activeVideo?.thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-20 blur-[150px] scale-150 transition-all duration-1000"
            style={{
              backgroundImage: `url(${activeVideo.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 md:px-12 md:py-5">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="group rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all">
                <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              </Button>
            </Link>
            <div className="h-8 w-px bg-white/5" />
            <div>
              <h1 className={cn(displayFont.className, "text-xl font-black text-white md:text-2xl tracking-tight")}>
                MPU-Focus <span className="text-primary italic">Academy</span>
              </h1>
              <p className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 md:block">
                Professional License Recovery Program
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="hidden border-emerald-500/20 bg-emerald-500/10 text-emerald-400 md:inline-flex px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl glow-emerald">
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              Aktiviert
            </Badge>
            <div className="h-10 w-10 cursor-pointer rounded-xl bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/20 transition-transform hover:scale-110 active:scale-95" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-12 lg:py-12">
        {error ? (
          <div className="glass-dark flex flex-col items-center justify-center py-32 text-center rounded-[3rem] border border-red-500/20">
            <div className="mb-6 h-20 w-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-4xl text-white font-black">!</span>
            </div>
            <h2 className={cn(displayFont.className, "text-2xl font-black text-white")}>System-Fehler</h2>
            <p className="mt-2 text-slate-400 max-w-md">{error}</p>
            <Button className="mt-8 rounded-2xl bg-white text-slate-950 font-black px-10 h-14 hover:bg-slate-200 transition-all" onClick={() => window.location.reload()}>Erneut versuchen</Button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
            {/* Cinematic Content Area */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              {/* Theater Mode Video Container */}
              <div className="relative group overflow-hidden rounded-[1.5rem] md:rounded-[3rem] bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10 transition-all hover:ring-white/20">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

                {activeVideo ? (
                  <div className="aspect-video relative">
                    <video
                      key={activeVideo.id}
                      controls
                      className="h-full w-full object-contain"
                      poster={activeVideo.thumbnailUrl || undefined}
                      src={activeVideo.videoUrl}
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center gap-6 bg-slate-900/50 backdrop-blur-md text-white">
                    <PlayCircle className="h-24 w-24 text-primary/20 animate-pulse" />
                    <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Bereit für Ihren Erfolg</p>
                  </div>
                )}

                {/* Overlay Controls (Visual only for now) */}
                {activeVideo && (
                  <div className="absolute top-8 right-8 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-black/60">
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Lesson Details */}
              <div className="glass-dark overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 lg:p-12">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-6 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-primary/20 text-primary border-primary/20 backdrop-blur-md px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl">
                        {activeVideo?.category || 'Lektion'}
                      </Badge>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(activeVideo?.durationSeconds)}
                      </div>
                    </div>
                    <h2 className={cn(displayFont.className, "text-2xl md:text-4xl font-black text-white lg:text-5xl leading-tight")}>
                      {activeVideo?.title || 'Wählen Sie ein Kapitel'}
                    </h2>
                    <p className="text-base md:text-xl leading-relaxed text-slate-400 font-medium">
                      {activeVideo?.description || 'Bereiten Sie sich systematisch auf Ihre MPU vor mit unseren Experten-Videos.'}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                      <Button className="h-12 md:h-14 rounded-2xl bg-primary px-6 md:px-8 font-black text-white glow-primary hover:bg-primary/90 hover:scale-[1.02] transition-all text-xs md:text-sm">
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Als abgeschlossen markieren
                      </Button>
                      <Button variant="ghost" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                        <Bookmark className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <Button variant="ghost" className="h-12 w-12 rounded-xl bg-white/5 text-slate-500">
                      <MoreVertical className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Sidebar Playlist */}
            <aside className="space-y-8 animate-in fade-in slide-in-from-right duration-1000">
              <section className="glass-dark flex items-center justify-between rounded-3xl p-4 md:p-6">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-blue-700/20 border border-primary/20">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, "text-lg font-black text-white tracking-tight")}>Programm-Inhalt</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{videos.length} Lektionen • {Math.round(videos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0) / 60)} Min.</p>
                  </div>
                </div>
              </section>

              <div className="space-y-10 h-[500px] lg:h-[calc(100vh-320px)] overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-5">
                    <h4 className="flex items-center px-4 text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                      <Layout className="mr-3 h-4 w-4 text-primary/50" />
                      {category}
                    </h4>
                    <div className="space-y-3">
                      {items.map((video, idx) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => setActiveVideo(video)}
                          className={cn(
                            "group relative flex w-full flex-col gap-4 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-left transition-all border",
                            activeVideo?.id === video.id
                              ? "bg-primary border-primary shadow-2xl glow-primary scale-[1.02] -translate-x-2"
                              : "glass-dark border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:-translate-x-1"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs transition-all",
                              activeVideo?.id === video.id ? "bg-white text-primary" : "bg-slate-900/50 border border-white/5 text-slate-500"
                            )}>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className={cn(
                                "truncate text-sm font-black tracking-tight",
                                activeVideo?.id === video.id ? "text-white" : "text-slate-300 group-hover:text-white"
                              )}>{video.title}</h5>
                              <div className={cn(
                                "flex items-center gap-4 text-[10px] font-black uppercase tracking-widest mt-1",
                                activeVideo?.id === video.id ? "text-white/60" : "text-slate-500"
                              )}>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(video.durationSeconds)}
                                </span>
                                {activeVideo?.id === video.id && (
                                  <span className="animate-pulse flex items-center gap-1.5 text-white bg-white/10 px-2 py-0.5 rounded">
                                    <PlayCircle className="h-3 w-3" />
                                    Läuft...
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className={cn(
                              "h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1",
                              activeVideo?.id === video.id ? "text-white" : "text-slate-700"
                            )} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {!videos.length && (
                  <div className="glass-dark border-dashed border-white/10 flex flex-col items-center justify-center py-20 rounded-[2rem]">
                    <PlayCircle className="mb-4 h-12 w-12 text-slate-800" />
                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Inhalte bald verfügbar</p>
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .glow-emerald {
          box-shadow: 0 0 15px -3px rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  )
}
