'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Layout,
  LifeBuoy,
  ListChecks,
  LogOut,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import VideoPlayer from '@/components/video/VideoPlayer'
import QuizSection from '@/components/quiz/QuizSection'

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
  provider: string | null
  youtubeVideoId: string | null
  muxPlaybackId: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  category: string
  categoryId: string | null
  categoryTitle: string | null
  categorySlug: string | null
  categoryOrderIndex: number | null
  chapterId: string | null
  chapterTitle: string | null
  chapterSlug: string | null
  chapterOrderIndex: number | null
  orderIndex: number
  progress: VideoProgress | null
}

type AgreementGateState = {
  blocked: boolean
  status: 'pending' | 'rejected' | null
  rejectionReason: string | null
}

type GroupedCategory = {
  id: string
  title: string
  orderIndex: number
  chapters: Array<{
    id: string
    title: string
    orderIndex: number
    videos: VideoItem[]
  }>
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Dauer offen'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

function clampProgress(value?: number | null) {
  return Math.max(0, Math.min(100, Math.round(value || 0)))
}

function getDisplayName(session: ReturnType<typeof useSession>['data']) {
  const firstName = session?.user?.firstName?.trim()
  const lastName = session?.user?.lastName?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  return fullName || session?.user?.email?.split('@')[0] || 'Teilnehmer'
}

function ProgressRing({ value }: { value: number }) {
  const radius = 43
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 112 112" className="h-28 w-28 -rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(displayFont.className, 'text-3xl font-bold text-white')}>{value}%</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">Fortschritt</span>
      </div>
    </div>
  )
}

function OnboardingGate({ status, rejectionReason }: { status: 'pending' | 'rejected' | null; rejectionReason: string | null }) {
  return (
    <section className="flex min-h-[560px] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-950 md:text-3xl')}>
          Noch ein Schritt: Vereinbarung unterzeichnen
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600 md:text-base">
          Bevor sich die Akademie für Sie öffnet, unterzeichnen Sie bitte die
          Betreuungsvereinbarung und laden Sie ein Ausweisdokument hoch. Das dauert
          nur wenige Minuten.
        </p>
        {status === 'rejected' && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-red-700">
              Ihre Einreichung wurde abgelehnt{rejectionReason ? `: ${rejectionReason}` : '.'}
            </p>
            <p className="mt-1 text-sm leading-6 text-red-600">
              Bitte unterzeichnen Sie die Vereinbarung erneut und reichen Sie Ihre Unterlagen noch einmal ein.
            </p>
          </div>
        )}
        <Link href="/onboarding">
          <Button className="mt-8 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 sm:w-auto sm:px-10">
            Jetzt unterzeichnen
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

function EmptyLibrary() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="grid min-h-[560px] lg:grid-cols-[1fr_0.86fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Zugang freigeschaltet
          </div>
          <h2 className={cn(displayFont.className, 'max-w-2xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl')}>
            Der Videokurs wird gerade vorbereitet.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Ihr Konto ist bereit. Sobald die ersten Lektionen hochgeladen sind, erscheinen sie
            automatisch hier in Ihrer Akademie.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: CalendarClock, label: 'Status', value: 'In Vorbereitung' },
              { icon: BookOpen, label: 'Lektionen', value: 'Noch keine Videos' },
              { icon: GraduationCap, label: 'Zugang', value: 'Aktiv' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <item.icon className="mb-4 h-5 w-5 text-blue-600" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[320px] border-t border-slate-200 bg-slate-950 lg:border-l lg:border-t-0">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.28),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">MPU Focus Akademie</p>
              <div className="mt-8 space-y-3">
                {['Grundlagen', 'Strategiegespräch', 'Prüfungsvorbereitung'].map((title, index) => (
                  <div key={title} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
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
      </div>
    </section>
  )
}

export default function LearnClient() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'videos' | 'quizzes'>('videos')
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [agreementGate, setAgreementGate] = useState<AgreementGateState>({
    blocked: false,
    status: null,
    rejectionReason: null,
  })

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

  useEffect(() => {
    let cancelled = false

    const checkAgreement = async () => {
      try {
        const response = await fetch('/api/agreements/me', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        if (!payload || cancelled) return
        const status = payload?.agreement?.status ?? null
        if (!payload.isAdmin && (status === null || status === 'pending' || status === 'rejected')) {
          setAgreementGate({
            blocked: true,
            status: status === 'rejected' ? 'rejected' : status === 'pending' ? 'pending' : null,
            rejectionReason: payload?.agreement?.rejectionReason || null,
          })
        }
      } catch {
        // Bei Netzwerk-/Serverfehlern die Akademie normal anzeigen (fail open).
      } finally {
        if (!cancelled) setAgreementChecked(true)
      }
    }

    checkAgreement()
    return () => {
      cancelled = true
    }
  }, [])

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) || null,
    [videos, activeVideoId],
  )

  const grouped = useMemo(() => {
    const categoryMap = new Map<string, GroupedCategory>()

    videos.forEach((video) => {
      const categoryId = video.categoryId || video.categorySlug || video.category || 'general'
      const chapterId = video.chapterId || video.chapterSlug || categoryId
      const category = categoryMap.get(categoryId) || {
        id: categoryId,
        title: video.categoryTitle || video.category || 'Allgemein',
        orderIndex: video.categoryOrderIndex ?? 999,
        chapters: [],
      }
      const existingChapter = category.chapters.find((chapter) => chapter.id === chapterId)
      if (existingChapter) {
        existingChapter.videos.push(video)
      } else {
        category.chapters.push({
          id: chapterId,
          title: video.chapterTitle || video.category || 'Lektionen',
          orderIndex: video.chapterOrderIndex ?? 999,
          videos: [video],
        })
      }
      categoryMap.set(categoryId, category)
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title))
      .map((category) => ({
        ...category,
        chapters: category.chapters
          .sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title))
          .map((chapter) => ({
            ...chapter,
            videos: chapter.videos.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
          })),
      }))
  }, [videos])

  const totalMinutes = Math.round(videos.reduce((acc, video) => acc + (video.durationSeconds || 0), 0) / 60)
  const completedVideos = videos.filter((video) => video.progress?.isCompleted).length
  const averageProgress = videos.length
    ? clampProgress(videos.reduce((acc, video) => acc + clampProgress(video.progress?.completionPercentage), 0) / videos.length)
    : 0
  const nextVideo = videos.find((video) => !video.progress?.isCompleted) || videos[0] || null
  const displayName = getDisplayName(session)

  const handleProgressUpdate = (videoId: string, progress: VideoProgress) => {
    setVideos((current) => current.map((video) => (
      video.id === videoId
        ? { ...video, progress }
        : video
    )))
  }

  if (loading || !agreementChecked) {
    return (
      <div className={cn(bodyFont.className, 'flex min-h-screen items-center justify-center bg-[#f6f8fb] text-slate-900')}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-600/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
              <PlayCircle className="h-8 w-8 animate-pulse text-blue-600" aria-hidden="true" />
            </div>
          </div>
          <p className={cn(displayFont.className, 'text-sm font-bold uppercase tracking-[0.18em] text-slate-500')}>Akademie wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-[#f6f8fb] text-slate-900 selection:bg-blue-200 selection:text-slate-950')}>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-950" aria-label="Zur Startseite">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <div className="h-8 w-px bg-slate-200" />
            <div className="min-w-0">
              <h1 className={cn(displayFont.className, 'truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl')}>
                MPU <span className="text-blue-600">Focus</span>
              </h1>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:block">
                Lernbereich
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 md:inline-flex">
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Akademie aktiv
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-red-600"
              aria-label="Abmelden"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 lg:px-10 lg:py-8">
        {agreementGate.blocked ? (
          <OnboardingGate status={agreementGate.status} rejectionReason={agreementGate.rejectionReason} />
        ) : error ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-20 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <span className="text-3xl font-black">!</span>
            </div>
            <h2 className={cn(displayFont.className, 'text-2xl font-bold text-slate-950')}>Inhalte konnten nicht geladen werden</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{error}</p>
            <Button className="mt-8 rounded-lg bg-slate-950 px-8 text-white hover:bg-slate-800" onClick={loadVideos}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Erneut versuchen
            </Button>
          </div>
        ) : videos.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <div className="grid gap-7 p-6 md:p-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] xl:items-center">
                <div>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                      <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
                      Lernbereich
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                      Akademie aktiv
                    </span>
                  </div>
                  <h2 className={cn(displayFont.className, 'max-w-3xl text-3xl font-bold tracking-tight md:text-4xl')}>
                    Willkommen zurück, {displayName}.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 md:text-base">
                    Machen Sie dort weiter, wo Sie aufgehört haben. Ihre Fortschritte werden beim
                    Lernen automatisch gespeichert.
                  </p>
                </div>

                <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <ProgressRing value={averageProgress} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-100">Mein Fortschritt</p>
                    <p className={cn(displayFont.className, 'mt-2 text-2xl font-bold text-white')}>
                      {completedVideos} von {videos.length}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-300">Lektionen abgeschlossen</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]">
              <div className="space-y-6">
                <div className="flex w-full items-center gap-1 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveTab('videos')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors sm:flex-none',
                      activeTab === 'videos'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                    )}
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    Videokurse
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('quizzes')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors sm:flex-none',
                      activeTab === 'quizzes'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                    )}
                  >
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                    Wissenstests
                  </button>
                </div>

                {activeTab === 'quizzes' ? (
                  <QuizSection />
                ) : (
                  <>
                <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Weiterlernen</p>
                      <h2 className={cn(displayFont.className, 'mt-1 text-2xl font-bold tracking-tight text-slate-950')}>
                        {activeVideo?.title || 'Wählen Sie eine Lektion'}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDuration(activeVideo?.durationSeconds)}
                      </span>
                      {activeVideo?.progress?.isCompleted && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Abgeschlossen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950">
                    {activeVideo ? (
                      <div className="aspect-video">
                        <VideoPlayer
                          key={activeVideo.id}
                          video={{
                            id: activeVideo.id,
                            title: activeVideo.title,
                            provider: activeVideo.provider,
                            youtubeVideoId: activeVideo.youtubeVideoId,
                            muxPlaybackId: activeVideo.muxPlaybackId,
                            durationSeconds: activeVideo.durationSeconds,
                          }}
                          userProgress={activeVideo.progress}
                          onProgressUpdate={(progress) => handleProgressUpdate(activeVideo.id, progress)}
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video flex-col items-center justify-center gap-6 bg-slate-900 text-white">
                        <PlayCircle className="h-20 w-20 text-white/20" aria-hidden="true" />
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Wählen Sie eine Lektion</p>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    <p className="text-base font-medium leading-7 text-slate-600">
                      {activeVideo?.description || 'Bereiten Sie sich systematisch mit den verfügbaren Lektionen auf Ihre MPU vor.'}
                    </p>
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                        <span>Lektionsfortschritt</span>
                        <span>{clampProgress(activeVideo?.progress?.completionPercentage)}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${clampProgress(activeVideo?.progress?.completionPercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:p-6">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Videokurse</p>
                      <h2 className={cn(displayFont.className, 'mt-1 text-2xl font-bold text-slate-950')}>Lernplan</h2>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{videos.length} Lektionen · {totalMinutes} Min.</p>
                  </div>

                  <div className="space-y-7">
                    {grouped.map((category) => (
                      <div key={category.id}>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          <Layout className="h-4 w-4 text-blue-400" aria-hidden="true" />
                          {category.title}
                        </h3>
                        <div className="space-y-5">
                          {category.chapters.map((chapter) => (
                            <div key={chapter.id}>
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-900">{chapter.title}</p>
                                <span className="text-xs font-bold text-slate-400">{chapter.videos.length} Lektionen</span>
                              </div>
                              <div className="grid gap-3">
                                {chapter.videos.map((video, index) => {
                                  const isActive = activeVideoId === video.id
                                  const progress = clampProgress(video.progress?.completionPercentage)
                                  return (
                                    <button
                                      key={video.id}
                                      type="button"
                                      onClick={() => setActiveVideoId(video.id)}
                                      className={cn(
                                        'group grid w-full gap-4 rounded-xl border p-3 text-left transition-all md:grid-cols-[112px_1fr_auto]',
                                        isActive
                                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                                      )}
                                    >
                                      <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100 md:h-16 md:w-28">
                                        {video.thumbnailUrl ? (
                                          <Image
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            fill
                                            sizes="112px"
                                            className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center">
                                            <PlayCircle className="h-7 w-7 text-slate-400" aria-hidden="true" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                                        <span className="absolute bottom-2 left-2 text-[10px] font-black uppercase tracking-wide text-white drop-shadow">
                                          {String(index + 1).padStart(2, '0')}
                                        </span>
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          {video.progress?.isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                                          <h4 className={cn(displayFont.className, 'line-clamp-1 text-base font-bold text-slate-950')}>
                                            {video.title}
                                          </h4>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                                          {video.description || 'Keine Beschreibung vorhanden.'}
                                        </p>
                                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-4 text-xs font-bold text-slate-500 md:flex-col md:items-end md:justify-center">
                                        <span>{formatDuration(video.durationSeconds)}</span>
                                        <span>{video.progress?.isCompleted ? 'Fertig' : progress ? `${progress}%` : 'Neu'}</span>
                                        <ChevronRight className={cn('hidden h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-600 md:block', isActive && 'text-blue-600')} aria-hidden="true" />
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                  </>
                )}
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Target className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Nächste Lektion</h2>
                      <p className="text-xs font-semibold text-slate-500">Empfohlener nächster Schritt</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{nextVideo?.title || 'Keine Lektion verfügbar'}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {nextVideo?.description || 'Sobald Inhalte bereitstehen, finden Sie hier Ihren nächsten Schritt.'}
                    </p>
                    {nextVideo && (
                      <Button
                        className="mt-4 h-11 w-full rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                        onClick={() => setActiveVideoId(nextVideo.id)}
                      >
                        Weiterlernen <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ListChecks className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Vorbereitung</h2>
                      <p className="text-xs font-semibold text-slate-500">Arbeitsmodus für Ihre MPU</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      ['Ruhig ansehen', 'Lektion ohne Ablenkung durcharbeiten.'],
                      ['Notizen machen', 'Wichtige Aussagen direkt festhalten.'],
                      ['Gespräch üben', 'Inhalte in eigene Worte übersetzen.'],
                    ].map(([title, detail], index) => (
                      <div key={title} className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-950">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-300">
                      <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className={cn(displayFont.className, 'text-xl font-bold')}>Begleitung</h2>
                      <p className="text-xs font-semibold text-slate-400">Persönliche Rückfragen</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    Wenn eine Lektion Fragen auslöst, bringen Sie diese in Ihr nächstes Gespräch mit.
                    Die Akademie ergänzt die persönliche Vorbereitung.
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
