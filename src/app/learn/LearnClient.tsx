'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  PlayCircle,
  Clock,
  ChevronRight,
  CheckCircle2,
  Layout,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import MuxVideoPlayer from '@/components/video/MuxVideoPlayer'

type VideoProgress = {
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
}

type VideoItem = {
  id: string
  title: string
  description: string | null
  videoUrl: string
  muxPlaybackId: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  category: string
  orderIndex: number
  progress: VideoProgress | null
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'n/a'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default function LearnClient() {
  const { t } = useI18n()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const loadVideos = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/videos', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Fehler beim Laden der Videos')
      }
      const list: VideoItem[] = (payload?.videos || []).sort((a: VideoItem, b: VideoItem) => (a.orderIndex || 0) - (b.orderIndex || 0))
      setVideos(list)
      setActiveVideoId((current) => current && list.some((video) => video.id === current) ? current : (list[0]?.id || null))
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der Videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) || null,
    [videos, activeVideoId],
  )

  const grouped = useMemo(() => {
    return videos.reduce<Record<string, VideoItem[]>>((acc, item) => {
      const cat = item.category || 'Allgemein'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [videos])

  const totalMinutes = Math.round(videos.reduce((acc, video) => acc + (video.durationSeconds || 0), 0) / 60)

  const handleProgressUpdate = (videoId: string, progress: VideoProgress) => {
    setVideos((current) => current.map((video) => (
      video.id === videoId
        ? { ...video, progress }
        : video
    )))
  }

  if (loading) {
    return (
      <div className={cn(bodyFont.className, 'flex min-h-screen items-center justify-center bg-premium-dark text-white')}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-primary/20 bg-slate-900/50 backdrop-blur-xl">
              <PlayCircle className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>
          <p className={cn(displayFont.className, 'text-xl font-medium tracking-widest uppercase opacity-50')}>Masterclass lädt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-premium-dark text-slate-200 selection:bg-primary selection:text-white')}>
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {activeVideo?.thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-20 blur-[150px] scale-150 transition-all duration-1000"
            style={{
              backgroundImage: `url(${activeVideo.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

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
              <h1 className={cn(displayFont.className, 'text-xl font-black text-white md:text-2xl tracking-tight')}>
                MPU-Focus <span className="text-primary italic">Academy</span>
              </h1>
              <p className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 md:block">
                Professional License Recovery Program
              </p>
            </div>
          </div>
          <Badge className="hidden border-emerald-500/20 bg-emerald-500/10 text-emerald-400 md:inline-flex px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl">
            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            Freigeschaltet
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-12 lg:py-12">
        {error ? (
          <div className="glass-dark flex flex-col items-center justify-center rounded-[3rem] border border-red-500/20 py-32 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20">
              <span className="text-4xl font-black">!</span>
            </div>
            <h2 className={cn(displayFont.className, 'text-2xl font-black text-white')}>System-Fehler</h2>
            <p className="mt-2 max-w-md text-slate-400">{error}</p>
            <Button className="mt-8 rounded-2xl bg-white px-10 text-slate-950 hover:bg-slate-200 transition-all" onClick={loadVideos}>
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <div className="relative overflow-hidden rounded-[1.5rem] md:rounded-[3rem] bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10">
                {activeVideo ? (
                  <div className="aspect-video">
                    <MuxVideoPlayer
                      key={activeVideo.id}
                      video={{
                        id: activeVideo.id,
                        title: activeVideo.title,
                        muxPlaybackId: activeVideo.muxPlaybackId,
                        durationSeconds: activeVideo.durationSeconds,
                      }}
                      userProgress={activeVideo.progress}
                      onProgressUpdate={(progress) => handleProgressUpdate(activeVideo.id, progress)}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-6 bg-slate-900/50 text-white">
                    <PlayCircle className="h-24 w-24 animate-pulse text-primary/20" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Bereit für Ihren Erfolg</p>
                  </div>
                )}
              </div>

              <div className="glass-dark overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 lg:p-12">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-xl border-primary/20 bg-primary/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {activeVideo?.category || 'Lektion'}
                    </Badge>
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(activeVideo?.durationSeconds)}
                    </div>
                    {activeVideo?.progress?.isCompleted && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('completed')}
                      </div>
                    )}
                  </div>
                  <h2 className={cn(displayFont.className, 'text-2xl md:text-4xl font-black text-white lg:text-5xl leading-tight')}>
                    {activeVideo?.title || 'Wählen Sie ein Kapitel'}
                  </h2>
                  <p className="text-base font-medium leading-relaxed text-slate-400 md:text-xl">
                    {activeVideo?.description || 'Bereiten Sie sich systematisch auf Ihre MPU vor mit unseren Experten-Videos.'}
                  </p>
                  {activeVideo?.progress && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
                        <span>{t('progress')}</span>
                        <span>{activeVideo.progress.completionPercentage}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, activeVideo.progress.completionPercentage))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-8 animate-in fade-in slide-in-from-right duration-1000">
              <section className="glass-dark flex items-center justify-between rounded-3xl p-4 md:p-6">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-blue-700/20">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, 'text-lg font-black tracking-tight text-white')}>Programm-Inhalt</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {videos.length} Lektionen • {totalMinutes} Min.
                    </p>
                  </div>
                </div>
              </section>

              <div className="custom-scrollbar h-[500px] space-y-10 overflow-y-auto pr-2 md:pr-4 lg:h-[calc(100vh-320px)]">
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
                          onClick={() => setActiveVideoId(video.id)}
                          className={cn(
                            'group relative flex w-full flex-col gap-4 rounded-[1.5rem] md:rounded-[2rem] border p-4 text-left transition-all',
                            activeVideoId === video.id
                              ? 'border-primary bg-primary/20 shadow-2xl shadow-primary/10'
                              : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]',
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <PlayCircle className="h-7 w-7 text-slate-600" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-2 left-2 text-[10px] font-black uppercase tracking-wide text-white">
                                {String(idx + 1).padStart(2, '0')}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h5 className={cn(displayFont.className, 'line-clamp-2 text-base font-bold text-white')}>
                                  {video.title}
                                </h5>
                                <ChevronRight className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', activeVideoId === video.id && 'translate-x-1 text-primary')} />
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-400">
                                {video.description || 'Keine Beschreibung vorhanden.'}
                              </p>
                              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span>{formatDuration(video.durationSeconds)}</span>
                                {video.progress?.isCompleted ? (
                                  <span className="text-emerald-300">{t('completed')}</span>
                                ) : video.progress ? (
                                  <span>{video.progress.completionPercentage}%</span>
                                ) : (
                                  <span>Neu</span>
                                )}
                              </div>
                              {video.progress && (
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${Math.max(0, Math.min(100, video.progress.completionPercentage))}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
