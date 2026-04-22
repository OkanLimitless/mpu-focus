'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
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
  CalendarClock,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
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
  if (!seconds || seconds <= 0) return 'k. A.'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

function EmptyLibrary() {
  return (
    <section className="grid min-h-[560px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.6)] lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="h-4 w-4" />
          Zugang freigeschaltet
        </div>
        <h2 className={cn(displayFont.className, 'max-w-2xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl')}>
          Der Videokurs wird gerade vorbereitet.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          Ihr Konto ist bereit. Sobald die ersten Lektionen hochgeladen sind, erscheinen sie automatisch hier in Ihrer Akademie.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarClock, label: 'Status', value: 'In Vorbereitung' },
            { icon: BookOpen, label: 'Lektionen', value: 'Noch keine Videos' },
            { icon: GraduationCap, label: 'Zugang', value: 'Aktiv' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <item.icon className="mb-4 h-5 w-5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-h-[320px] border-t border-slate-200 bg-slate-950 lg:border-l lg:border-t-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.28),transparent_45%),radial-gradient(circle_at_70%_20%,rgba(249,115,22,0.22),transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">MPU-Focus Akademie</p>
            <div className="mt-8 space-y-3">
              {['Grundlagen', 'Strategiegespräch', 'Prüfungsvorbereitung'].map((title, index) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="text-xs text-slate-300">Wird bald hinzugefügt</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-sm leading-6 text-slate-300">
            Sie müssen nichts weiter tun. Aktualisieren Sie die Seite später, um neue Inhalte zu sehen.
          </p>
        </div>
      </div>
    </section>
  )
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
      <div className={cn(bodyFont.className, 'flex min-h-screen items-center justify-center bg-slate-50 text-slate-900')}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
              <PlayCircle className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>
          <p className={cn(displayFont.className, 'text-sm font-bold uppercase tracking-[0.18em] text-slate-500')}>Akademie wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-slate-50 text-slate-900 selection:bg-primary selection:text-white')}>
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.09),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
        {activeVideo?.thumbnailUrl && (
          <div
            className="absolute inset-0 scale-150 opacity-10 blur-[150px] transition-all duration-1000"
            style={{
              backgroundImage: `url(${activeVideo.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="group h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950">
                <ArrowLeft className="h-4 w-4 transition-colors" />
              </Button>
            </Link>
            <div className="h-8 w-px bg-slate-200" />
            <div className="min-w-0">
              <h1 className={cn(displayFont.className, 'truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl')}>
                MPU-Focus <span className="text-primary">Akademie</span>
              </h1>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:block">
                Ihr geschützter Kursbereich
              </p>
            </div>
          </div>
          <Badge className="hidden rounded-full border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 md:inline-flex">
            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            Freigeschaltet
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 lg:px-10 lg:py-10">
        {error ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[2rem] border border-red-100 bg-white px-6 py-20 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.6)]">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <span className="text-3xl font-black">!</span>
            </div>
            <h2 className={cn(displayFont.className, 'text-2xl font-bold text-slate-950')}>Inhalte konnten nicht geladen werden</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{error}</p>
            <Button className="mt-8 rounded-full bg-slate-950 px-8 text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800" onClick={loadVideos}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        ) : videos.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-black shadow-[0_28px_90px_-42px_rgba(15,23,42,0.8)] md:rounded-[2rem]">
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
                  <div className="flex aspect-video flex-col items-center justify-center gap-6 bg-slate-900 text-white">
                    <PlayCircle className="h-20 w-20 text-white/20" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Wählen Sie eine Lektion</p>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:rounded-[2rem] md:p-10">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-full border-blue-100 bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {activeVideo?.category || 'Lektion'}
                    </Badge>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(activeVideo?.durationSeconds)}
                    </div>
                    {activeVideo?.progress?.isCompleted && (
                      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('completed')}
                      </div>
                    )}
                  </div>
                  <h2 className={cn(displayFont.className, 'text-2xl font-bold leading-tight text-slate-950 md:text-4xl lg:text-5xl')}>
                    {activeVideo?.title || 'Wählen Sie ein Kapitel'}
                  </h2>
                  <p className="text-base font-medium leading-relaxed text-slate-600 md:text-lg">
                    {activeVideo?.description || 'Bereiten Sie sich systematisch mit den verfügbaren Lektionen auf Ihre MPU vor.'}
                  </p>
                  {activeVideo?.progress && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        <span>{t('progress')}</span>
                        <span>{activeVideo.progress.completionPercentage}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
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
              <section className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, 'text-lg font-bold tracking-tight text-slate-950')}>Programm-Inhalt</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {videos.length} Lektionen • {totalMinutes} Min.
                    </p>
                  </div>
                </div>
              </section>

              <div className="custom-scrollbar h-[500px] space-y-10 overflow-y-auto pr-2 md:pr-4 lg:h-[calc(100vh-320px)]">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-5">
                    <h4 className="flex items-center px-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
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
                            'group relative flex w-full flex-col gap-4 rounded-[1.25rem] border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 md:rounded-[1.5rem]',
                            activeVideoId === video.id
                              ? 'border-blue-200 bg-blue-50 shadow-blue-950/10'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                              {video.thumbnailUrl ? (
                                <Image
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  fill
                                  sizes="96px"
                                  className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <PlayCircle className="h-7 w-7 text-slate-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                              <div className="absolute bottom-2 left-2 text-[10px] font-black uppercase tracking-wide text-white drop-shadow">
                                {String(idx + 1).padStart(2, '0')}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h5 className={cn(displayFont.className, 'line-clamp-2 text-base font-bold text-slate-950')}>
                                  {video.title}
                                </h5>
                                <ChevronRight className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', activeVideoId === video.id && 'translate-x-1 text-primary')} />
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">
                                {video.description || 'Keine Beschreibung vorhanden.'}
                              </p>
                              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span>{formatDuration(video.durationSeconds)}</span>
                                {video.progress?.isCompleted ? (
                                  <span className="text-emerald-700">{t('completed')}</span>
                                ) : video.progress ? (
                                  <span>{video.progress.completionPercentage}%</span>
                                ) : (
                                  <span>Neu</span>
                                )}
                              </div>
                              {video.progress && (
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
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
