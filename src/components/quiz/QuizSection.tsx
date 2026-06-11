'use client'

import { useEffect, useMemo, useState } from 'react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  AlertTriangle,
  Award,
  ChevronRight,
  ClipboardList,
  Clock,
  Layout,
  ListChecks,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import QuizPlayer from '@/components/quiz/QuizPlayer'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

type QuizAttemptSummary = {
  count: number
  bestPercentage: number | null
  lastPercentage: number | null
  lastPassed: boolean | null
  lastNeedsReview: boolean
  lastAttemptAt: string | null
  everPassed: boolean
}

type QuizListItem = {
  id: string
  title: string
  description: string | null
  chapterId: string | null
  chapterTitle: string | null
  categoryTitle: string | null
  passPercentage: number
  questionCount: number
  totalPoints: number
  myAttempts: QuizAttemptSummary
}

type GroupedQuizCategory = {
  title: string
  chapters: Array<{
    key: string
    title: string | null
    quizzes: QuizListItem[]
  }>
}

function QuizStatusBadge({ attempts }: { attempts: QuizAttemptSummary }) {
  if (!attempts || attempts.count === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
        Neu
      </span>
    )
  }
  if (attempts.everPassed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <Award className="h-3.5 w-3.5" aria-hidden="true" />
        Bestanden{attempts.bestPercentage != null ? ` · ${Math.round(attempts.bestPercentage)}%` : ''}
      </span>
    )
  }
  if (attempts.lastNeedsReview) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Wird bewertet
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
      Letzter Versuch: {Math.round(attempts.lastPercentage || 0)}%
    </span>
  )
}

export default function QuizSection() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)

  const loadQuizzes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/quizzes', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Die Wissenstests konnten nicht geladen werden.')
      }
      setQuizzes(Array.isArray(payload?.quizzes) ? payload.quizzes : [])
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Die Wissenstests konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuizzes()
  }, [])

  const refreshQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (response.ok && Array.isArray(payload?.quizzes)) {
        setQuizzes(payload.quizzes)
      }
    } catch {
      // Stilles Aktualisieren – Fehler hier nicht anzeigen.
    }
  }

  const grouped = useMemo<GroupedQuizCategory[]>(() => {
    const categoryMap = new Map<string, GroupedQuizCategory>()

    quizzes.forEach((quiz) => {
      const categoryTitle = quiz.categoryTitle || 'Allgemein'
      const category = categoryMap.get(categoryTitle) || { title: categoryTitle, chapters: [] }
      const chapterKey = quiz.chapterId || quiz.chapterTitle || '__none__'
      const chapter = category.chapters.find((entry) => entry.key === chapterKey)
      if (chapter) {
        chapter.quizzes.push(quiz)
      } else {
        category.chapters.push({ key: chapterKey, title: quiz.chapterTitle, quizzes: [quiz] })
      }
      categoryMap.set(categoryTitle, category)
    })

    const categories = Array.from(categoryMap.values())
    // "Allgemein" ans Ende sortieren, sonst Reihenfolge der API beibehalten.
    return categories.sort((a, b) => {
      if (a.title === 'Allgemein' && b.title !== 'Allgemein') return 1
      if (b.title === 'Allgemein' && a.title !== 'Allgemein') return -1
      return 0
    })
  }, [quizzes])

  if (activeQuizId) {
    return (
      <QuizPlayer
        quizId={activeQuizId}
        onClose={() => setActiveQuizId(null)}
        onFinished={refreshQuizzes}
      />
    )
  }

  if (loading) {
    return (
      <section className={cn(bodyFont.className, 'flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-10 shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <p className={cn(displayFont.className, 'mt-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-500')}>
          Wissenstests werden geladen...
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={cn(bodyFont.className, 'flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Wissenstests konnten nicht geladen werden</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{error}</p>
        <Button className="mt-7 rounded-lg bg-slate-950 px-6 font-bold text-white hover:bg-slate-800" onClick={loadQuizzes}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Erneut versuchen
        </Button>
      </section>
    )
  }

  if (quizzes.length === 0) {
    return (
      <section className={cn(bodyFont.className, 'flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <ClipboardList className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className={cn(displayFont.className, 'text-2xl font-bold text-slate-950')}>Noch keine Wissenstests verfügbar</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          Sobald Ihr Coach Tests für Sie freischaltet, erscheinen sie automatisch hier.
          Arbeiten Sie in der Zwischenzeit die Videolektionen durch.
        </p>
      </section>
    )
  }

  return (
    <section className={cn(bodyFont.className, 'rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:p-6')}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Wissenstests</p>
          <h2 className={cn(displayFont.className, 'mt-1 text-2xl font-bold text-slate-950')}>Ihr Wissen prüfen</h2>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          {quizzes.length} {quizzes.length === 1 ? 'Test' : 'Tests'}
        </p>
      </div>

      <div className="space-y-7">
        {grouped.map((category) => (
          <div key={category.title}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <Layout className="h-4 w-4 text-blue-400" aria-hidden="true" />
              {category.title}
            </h3>
            <div className="space-y-5">
              {category.chapters.map((chapter) => (
                <div key={chapter.key}>
                  {chapter.title && (
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">{chapter.title}</p>
                      <span className="text-xs font-bold text-slate-400">
                        {chapter.quizzes.length} {chapter.quizzes.length === 1 ? 'Test' : 'Tests'}
                      </span>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {chapter.quizzes.map((quiz) => {
                      const attempted = quiz.myAttempts?.count > 0
                      return (
                        <div
                          key={quiz.id}
                          className="group grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={cn(displayFont.className, 'text-base font-bold text-slate-950')}>
                                {quiz.title}
                              </h4>
                              <QuizStatusBadge attempts={quiz.myAttempts} />
                            </div>
                            {quiz.description && (
                              <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                                {quiz.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                                {quiz.questionCount} {quiz.questionCount === 1 ? 'Frage' : 'Fragen'}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                                Bestehensgrenze {quiz.passPercentage}%
                              </span>
                            </div>
                          </div>

                          <Button
                            className="h-11 rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
                            onClick={() => setActiveQuizId(quiz.id)}
                          >
                            {attempted ? 'Erneut versuchen' : 'Test starten'}
                            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
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
  )
}
