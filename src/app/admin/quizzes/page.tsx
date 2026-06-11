'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  HelpCircle,
  Edit3,
  EyeOff,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type QuestionOption = {
  id: string
  text: string
  isCorrect: boolean
}

type QuizQuestion = {
  id: string
  quizId: string
  question: string
  questionType: 'multiple_choice' | 'open'
  options: QuestionOption[]
  explanation: string | null
  points: number
  orderIndex: number
}

type QuizItem = {
  id: string
  title: string
  description: string | null
  chapterId: string | null
  chapterTitle: string | null
  categoryTitle: string | null
  passPercentage: number
  orderIndex: number
  isPublished: boolean
  createdAt: string | null
  questionCount: number
  totalPoints: number
  questions: QuizQuestion[]
  attemptStats: {
    count: number
    averagePercentage: number
    needsReview: number
    passed: number
  }
}

type ChapterItem = {
  id: string
  title: string
  categoryId: string
}

type CategoryItem = {
  id: string
  name: string
  slug: string
  chapters: ChapterItem[]
}

type AttemptAnswer = {
  questionId: string
  question: string
  questionType: 'multiple_choice' | 'open'
  options: QuestionOption[]
  selectedOptionIds: string[]
  answerText: string | null
  isCorrect: boolean | null
  pointsAwarded: number
  maxPoints: number
  needsReview: boolean
}

type AttemptItem = {
  id: string
  profileName: string
  profileEmail: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean | null
  needsReview: boolean
  reviewedAt: string | null
  completedAt: string | null
  answers: AttemptAnswer[]
}

type AttemptsPayload = {
  quiz: { id: string; title: string; passPercentage: number }
  attempts: AttemptItem[]
}

type EditorQuestion = {
  question: string
  questionType: 'multiple_choice' | 'open'
  options: Array<{ id: string; text: string; isCorrect: boolean }>
  explanation: string
  points: number
}

type EditorState = {
  id?: string
  title: string
  description: string
  chapterId: string
  passPercentage: number
  orderIndex: number
  isPublished: boolean
  questions: EditorQuestion[]
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload?.error || 'Aktion fehlgeschlagen.')
  return payload as T
}

function nextOptionId(options: Array<{ id: string }>) {
  const max = options.reduce((acc, option) => {
    const match = /^opt-(\d+)$/.exec(option.id)
    return match ? Math.max(acc, Number(match[1])) : acc
  }, 0)
  return `opt-${Math.max(max, options.length) + 1}`
}

function createQuestion(type: 'multiple_choice' | 'open'): EditorQuestion {
  return {
    question: '',
    questionType: type,
    options: type === 'multiple_choice'
      ? [
          { id: 'opt-1', text: '', isCorrect: false },
          { id: 'opt-2', text: '', isCorrect: false },
        ]
      : [],
    explanation: '',
    points: 1,
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Unbekanntes Datum'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unbekanntes Datum'
  return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

function toQuestionInput(question: QuizQuestion) {
  return {
    question: question.question,
    questionType: question.questionType,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
    explanation: question.explanation || '',
    points: question.points,
  }
}

export default function QuizzesPage() {
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)

  const [attemptsQuizId, setAttemptsQuizId] = useState<string | null>(null)
  const [attemptsData, setAttemptsData] = useState<AttemptsPayload | null>(null)
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [expandedAttempts, setExpandedAttempts] = useState<Record<string, boolean>>({})
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, Record<string, number>>>({})
  const [gradingAttemptId, setGradingAttemptId] = useState<string | null>(null)

  const publishedCount = quizzes.filter((quiz) => quiz.isPublished).length
  const totalAttempts = quizzes.reduce((sum, quiz) => sum + (quiz.attemptStats?.count || 0), 0)
  const openReviews = quizzes.reduce((sum, quiz) => sum + (quiz.attemptStats?.needsReview || 0), 0)

  const chapterOptions = useMemo(
    () =>
      categories.flatMap((category) =>
        (category.chapters || []).map((chapter) => ({
          id: chapter.id,
          label: `${category.name} / ${chapter.title}`,
        })),
      ),
    [categories],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [quizPayload, categoryPayload] = await Promise.all([
        requestJson<{ quizzes: QuizItem[] }>('/api/admin/quizzes', { cache: 'no-store' }),
        requestJson<{ categories: CategoryItem[] }>('/api/admin/video-categories', { cache: 'no-store' }),
      ])
      setQuizzes(quizPayload.quizzes || [])
      setCategories(categoryPayload.categories || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadAttempts = useCallback(async (quizId: string) => {
    setAttemptsLoading(true)
    try {
      const payload = await requestJson<AttemptsPayload>(`/api/admin/quizzes/${quizId}/attempts`, { cache: 'no-store' })
      const attempts = [...(payload.attempts || [])].sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return timeB - timeA
      })
      setAttemptsData({ ...payload, attempts })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Ergebnisse konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setAttemptsLoading(false)
    }
  }, [toast])

  const openAttempts = (quiz: QuizItem) => {
    setAttemptsQuizId(quiz.id)
    setAttemptsData(null)
    setExpandedAttempts({})
    setGradeDrafts({})
    loadAttempts(quiz.id)
  }

  const openCreate = () => {
    setEditor({
      title: '',
      description: '',
      chapterId: 'none',
      passPercentage: 70,
      orderIndex: quizzes.length + 1,
      isPublished: false,
      questions: [],
    })
  }

  const openEdit = (quiz: QuizItem) => {
    setEditor({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || '',
      chapterId: quiz.chapterId || 'none',
      passPercentage: quiz.passPercentage,
      orderIndex: quiz.orderIndex,
      isPublished: quiz.isPublished,
      questions: [...quiz.questions]
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((question) => ({
          question: question.question,
          questionType: question.questionType,
          options: (question.options || []).map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
          explanation: question.explanation || '',
          points: question.points,
        })),
    })
  }

  const updateQuestion = (index: number, patch: Partial<EditorQuestion>) => {
    setEditor((current) => {
      if (!current) return current
      const questions = current.questions.map((question, i) => (i === index ? { ...question, ...patch } : question))
      return { ...current, questions }
    })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setEditor((current) => {
      if (!current) return current
      const target = index + direction
      if (target < 0 || target >= current.questions.length) return current
      const questions = [...current.questions]
      const [removed] = questions.splice(index, 1)
      questions.splice(target, 0, removed)
      return { ...current, questions }
    })
  }

  const removeQuestion = (index: number) => {
    setEditor((current) => {
      if (!current) return current
      return { ...current, questions: current.questions.filter((_, i) => i !== index) }
    })
  }

  const changeQuestionType = (index: number, type: 'multiple_choice' | 'open') => {
    setEditor((current) => {
      if (!current) return current
      const questions = current.questions.map((question, i) => {
        if (i !== index) return question
        if (type === question.questionType) return question
        return {
          ...question,
          questionType: type,
          options: type === 'multiple_choice'
            ? (question.options.length >= 2
                ? question.options
                : [
                    { id: 'opt-1', text: '', isCorrect: false },
                    { id: 'opt-2', text: '', isCorrect: false },
                  ])
            : [],
        }
      })
      return { ...current, questions }
    })
  }

  const saveQuiz = async () => {
    if (!editor) return
    if (!editor.title.trim()) {
      toast({ title: 'Titel fehlt', description: 'Bitte geben Sie einen Titel für den Wissenstest ein.', variant: 'destructive' })
      return
    }
    if (editor.questions.length === 0) {
      toast({ title: 'Keine Fragen', description: 'Bitte fügen Sie mindestens eine Frage hinzu.', variant: 'destructive' })
      return
    }
    for (let i = 0; i < editor.questions.length; i += 1) {
      const question = editor.questions[i]
      if (!question.question.trim()) {
        toast({ title: `Frage ${i + 1} unvollständig`, description: 'Bitte geben Sie den Fragetext ein.', variant: 'destructive' })
        return
      }
      if (question.questionType === 'multiple_choice') {
        const filledOptions = question.options.filter((option) => option.text.trim())
        if (filledOptions.length < 2) {
          toast({ title: `Frage ${i + 1} unvollständig`, description: 'Multiple-Choice-Fragen benötigen mindestens 2 ausgefüllte Antwortoptionen.', variant: 'destructive' })
          return
        }
        if (!filledOptions.some((option) => option.isCorrect)) {
          toast({ title: `Frage ${i + 1} unvollständig`, description: 'Bitte markieren Sie mindestens eine Antwortoption als richtig.', variant: 'destructive' })
          return
        }
      }
    }

    setSaving(true)
    try {
      const body = {
        title: editor.title.trim(),
        description: editor.description.trim(),
        chapterId: editor.chapterId === 'none' ? null : editor.chapterId,
        passPercentage: editor.passPercentage,
        orderIndex: editor.orderIndex,
        isPublished: editor.isPublished,
        questions: editor.questions.map((question) => ({
          question: question.question.trim(),
          questionType: question.questionType,
          options: question.questionType === 'multiple_choice'
            ? question.options
                .filter((option) => option.text.trim())
                .map((option) => ({ id: option.id, text: option.text.trim(), isCorrect: option.isCorrect }))
            : [],
          explanation: question.explanation.trim(),
          points: question.points,
        })),
      }
      await requestJson(editor.id ? `/api/admin/quizzes/${editor.id}` : '/api/admin/quizzes', {
        method: editor.id ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      })
      setEditor(null)
      await loadData()
      toast({ title: 'Gespeichert', description: 'Der Wissenstest wurde erfolgreich gespeichert.' })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Wissenstest konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (quiz: QuizItem) => {
    setBusyKey(`publish-${quiz.id}`)
    try {
      await requestJson(`/api/admin/quizzes/${quiz.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description || '',
          chapterId: quiz.chapterId,
          passPercentage: quiz.passPercentage,
          orderIndex: quiz.orderIndex,
          isPublished: !quiz.isPublished,
          questions: [...quiz.questions]
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map(toQuestionInput),
        }),
      })
      await loadData()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Sichtbarkeit konnte nicht geändert werden.',
        variant: 'destructive',
      })
    } finally {
      setBusyKey(null)
    }
  }

  const deleteQuiz = async (quiz: QuizItem) => {
    if (!window.confirm('Diesen Wissenstest wirklich löschen? Alle Fragen und Ergebnisse gehen dabei verloren.')) return
    setBusyKey(`delete-${quiz.id}`)
    try {
      await requestJson(`/api/admin/quizzes/${quiz.id}`, { method: 'DELETE' })
      await loadData()
      toast({ title: 'Gelöscht', description: 'Der Wissenstest wurde entfernt.' })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Wissenstest konnte nicht gelöscht werden.',
        variant: 'destructive',
      })
    } finally {
      setBusyKey(null)
    }
  }

  const saveGrades = async (attempt: AttemptItem) => {
    if (!attemptsQuizId) return
    const grades: Record<string, number> = {}
    attempt.answers
      .filter((answer) => answer.questionType === 'open')
      .forEach((answer) => {
        const draft = gradeDrafts[attempt.id]?.[answer.questionId]
        const value = typeof draft === 'number' ? draft : answer.pointsAwarded || 0
        grades[answer.questionId] = Math.min(Math.max(0, value), answer.maxPoints)
      })

    setGradingAttemptId(attempt.id)
    try {
      await requestJson(`/api/admin/quiz-attempts/${attempt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ grades }),
      })
      toast({ title: 'Bewertung gespeichert', description: 'Der Versuch wurde neu bewertet.' })
      await Promise.all([loadAttempts(attemptsQuizId), loadData()])
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Bewertung konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setGradingAttemptId(null)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <ListChecks className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-950')}>Wissenstests</h1>
            <p className="text-sm font-semibold text-slate-500">Quizfragen erstellen, Kapiteln zuordnen und Ergebnisse bewerten.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            Aktualisieren
          </Button>
          <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Quiz erstellen
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Wissenstests</p>
          <p className={cn(displayFont.className, 'mt-1 text-xl font-bold text-slate-950')}>{publishedCount}/{quizzes.length} sichtbar</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Versuche gesamt</p>
          <p className={cn(displayFont.className, 'mt-1 text-xl font-bold text-slate-950')}>{totalAttempts}</p>
        </div>
        <div className={cn('rounded-xl border px-4 py-3', openReviews > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white')}>
          <p className={cn('text-xs font-bold uppercase tracking-[0.14em]', openReviews > 0 ? 'text-amber-600' : 'text-slate-400')}>Offene Bewertungen</p>
          <p className={cn(displayFont.className, 'mt-1 text-xl font-bold', openReviews > 0 ? 'text-amber-700' : 'text-slate-950')}>{openReviews}</p>
        </div>
      </section>

      {loading && quizzes.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-500">Wissenstests werden geladen...</p>
        </div>
      )}

      {!loading && quizzes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Noch keine Wissenstests</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Erstellen Sie Ihren ersten Wissenstest und ordnen Sie ihn einem Kapitel zu.</p>
          <Button className="mt-5 gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Quiz erstellen
          </Button>
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={quiz.isPublished ? 'default' : 'secondary'} className={cn(quiz.isPublished && 'bg-emerald-600 text-white')}>
                      {quiz.isPublished ? 'Sichtbar' : 'Entwurf'}
                    </Badge>
                    {quiz.chapterTitle && (
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        {quiz.categoryTitle ? `${quiz.categoryTitle} / ${quiz.chapterTitle}` : quiz.chapterTitle}
                      </Badge>
                    )}
                    <span className="text-xs font-bold text-slate-500">{quiz.questionCount} Fragen · {quiz.totalPoints} Punkte</span>
                    <span className="text-xs font-bold text-slate-500">Bestehensgrenze {quiz.passPercentage}%</span>
                    {quiz.attemptStats.count > 0 && (
                      <span className="text-xs font-bold text-slate-500">
                        {quiz.attemptStats.count} Versuche · Ø {Math.round(quiz.attemptStats.averagePercentage)}%
                      </span>
                    )}
                    {quiz.attemptStats.needsReview > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        {quiz.attemptStats.needsReview} offene Bewertung{quiz.attemptStats.needsReview === 1 ? '' : 'en'}
                      </Badge>
                    )}
                  </div>
                  <h3 className={cn(displayFont.className, 'mt-2 text-lg font-bold text-slate-950')}>{quiz.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600">{quiz.description || 'Keine Beschreibung vorhanden.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => openAttempts(quiz)}>
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    Ergebnisse
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(quiz)}>
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Bearbeiten
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => togglePublish(quiz)}
                    disabled={busyKey === `publish-${quiz.id}`}
                    title={quiz.isPublished ? 'Ausblenden' : 'Sichtbar machen'}
                  >
                    {busyKey === `publish-${quiz.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : quiz.isPublished ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => deleteQuiz(quiz)}
                    disabled={busyKey === `delete-${quiz.id}`}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editor} onOpenChange={(open) => { if (!open && !saving) setEditor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editor?.id ? 'Quiz bearbeiten' : 'Quiz erstellen'}</DialogTitle>
            <DialogDescription>Fragen festlegen, Kapitel zuordnen und Bestehensgrenze definieren.</DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="z. B. Wissenstest: MPU Grundlagen"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                  rows={3}
                  disabled={saving}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label>Kapitel</Label>
                  <Select value={editor.chapterId} onValueChange={(value) => setEditor({ ...editor, chapterId: value })}>
                    <SelectTrigger><SelectValue placeholder="Kapitel wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Kapitel</SelectItem>
                      {chapterOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bestehensgrenze (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editor.passPercentage}
                    onChange={(e) => setEditor({ ...editor, passPercentage: Math.min(100, Math.max(0, Number(e.target.value || 0))) })}
                    disabled={saving}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editor.isPublished}
                  onChange={(e) => setEditor({ ...editor, isPublished: e.target.checked })}
                  disabled={saving}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Sofort sichtbar
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={cn(displayFont.className, 'text-base font-bold text-slate-950')}>Fragen ({editor.questions.length})</h4>
                </div>

                {editor.questions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">
                    <p className="text-sm font-bold text-slate-700">Noch keine Fragen</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Fügen Sie unten Ihre erste Frage hinzu.</p>
                  </div>
                )}

                {editor.questions.map((question, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        Frage {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveQuestion(index, -1)} disabled={index === 0 || saving} title="Nach oben">
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveQuestion(index, 1)} disabled={index === editor.questions.length - 1 || saving} title="Nach unten">
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeQuestion(index)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Frage entfernen
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Fragetext</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(index, { question: e.target.value })}
                          rows={2}
                          placeholder="Formulieren Sie die Frage..."
                          disabled={saving}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                        <div className="space-y-2">
                          <Label>Fragetyp</Label>
                          <Select
                            value={question.questionType}
                            onValueChange={(value) => changeQuestionType(index, value as 'multiple_choice' | 'open')}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="open">Offene Frage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Punkte</Label>
                          <Input
                            type="number"
                            min={1}
                            value={question.points}
                            onChange={(e) => updateQuestion(index, { points: Math.max(1, Number(e.target.value || 1)) })}
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {question.questionType === 'multiple_choice' ? (
                        <div className="space-y-2">
                          <Label>Antwortoptionen</Label>
                          <p className="text-xs font-semibold text-slate-500">Mehrere richtige Antworten sind möglich. Markieren Sie alle zutreffenden Optionen.</p>
                          {question.options.map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <Input
                                value={option.text}
                                onChange={(e) => updateQuestion(index, {
                                  options: question.options.map((current, i) => (i === optionIndex ? { ...current, text: e.target.value } : current)),
                                })}
                                placeholder={`Option ${optionIndex + 1}`}
                                disabled={saving}
                              />
                              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={option.isCorrect}
                                  onChange={(e) => updateQuestion(index, {
                                    options: question.options.map((current, i) => (i === optionIndex ? { ...current, isCorrect: e.target.checked } : current)),
                                  })}
                                  disabled={saving}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                Richtig
                              </label>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600"
                                onClick={() => updateQuestion(index, { options: question.options.filter((_, i) => i !== optionIndex) })}
                                disabled={question.options.length <= 2 || saving}
                                title="Option entfernen"
                              >
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => updateQuestion(index, {
                              options: [...question.options, { id: nextOptionId(question.options), text: '', isCorrect: false }],
                            })}
                            disabled={saving}
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Option hinzufügen
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          Diese Frage wird von Ihnen manuell bewertet.
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Erklärung (optional)</Label>
                        <Textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                          rows={2}
                          placeholder="Wird den Teilnehmern nach dem Absenden angezeigt."
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setEditor({ ...editor, questions: [...editor.questions, createQuestion('multiple_choice')] })}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Multiple-Choice-Frage hinzufügen
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setEditor({ ...editor, questions: [...editor.questions, createQuestion('open')] })}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Offene Frage hinzufügen
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>Abbrechen</Button>
            <Button onClick={saveQuiz} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!attemptsQuizId} onOpenChange={(open) => { if (!open) { setAttemptsQuizId(null); setAttemptsData(null) } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{attemptsData?.quiz.title || 'Ergebnisse'}</DialogTitle>
            <DialogDescription>
              {attemptsData
                ? `Bestehensgrenze ${attemptsData.quiz.passPercentage}% · ${attemptsData.attempts.length} Versuch${attemptsData.attempts.length === 1 ? '' : 'e'}`
                : 'Alle Versuche der Teilnehmer für diesen Wissenstest.'}
            </DialogDescription>
          </DialogHeader>

          {attemptsLoading && (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-500">Ergebnisse werden geladen...</p>
            </div>
          )}

          {!attemptsLoading && attemptsData && attemptsData.attempts.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-bold text-slate-700">Noch keine Versuche</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Sobald Teilnehmer den Wissenstest absolvieren, erscheinen die Ergebnisse hier.</p>
            </div>
          )}

          {!attemptsLoading && attemptsData && attemptsData.attempts.length > 0 && (
            <div className="space-y-3">
              {attemptsData.attempts.map((attempt) => {
                const isExpanded = !!expandedAttempts[attempt.id]
                const awaitingReview = attempt.needsReview || attempt.passed === null
                return (
                  <div key={attempt.id} className="rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExpandedAttempts((current) => ({ ...current, [attempt.id]: !current[attempt.id] }))}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-950">{attempt.profileName}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{attempt.profileEmail} · {formatDate(attempt.completedAt)}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-slate-600">
                        {attempt.score}/{attempt.maxScore} Punkte · {Math.round(attempt.percentage)}%
                      </span>
                      {awaitingReview ? (
                        <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">Wartet auf Bewertung</Badge>
                      ) : attempt.passed ? (
                        <Badge className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-600">Bestanden</Badge>
                      ) : (
                        <Badge className="shrink-0 bg-red-100 text-red-700 hover:bg-red-100">Nicht bestanden</Badge>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-slate-200 bg-slate-50/60 p-4">
                        {attempt.answers.map((answer, answerIndex) => (
                          <div key={answer.questionId} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start gap-2">
                              {answer.isCorrect === true ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                              ) : answer.isCorrect === false ? (
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                              ) : (
                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-950">{answerIndex + 1}. {answer.question}</p>
                                {answer.questionType === 'multiple_choice' ? (
                                  <ul className="mt-2 space-y-1">
                                    {answer.options.map((option) => {
                                      const selected = answer.selectedOptionIds.includes(option.id)
                                      return (
                                        <li
                                          key={option.id}
                                          className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold',
                                            selected ? 'bg-blue-50 text-blue-800' : 'text-slate-600',
                                          )}
                                        >
                                          <span className={cn(
                                            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-black',
                                            selected ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent',
                                          )}>
                                            ✓
                                          </span>
                                          <span className="min-w-0 flex-1">{option.text}</span>
                                          {option.isCorrect && (
                                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Richtig</span>
                                          )}
                                        </li>
                                      )
                                    })}
                                  </ul>
                                ) : (
                                  <blockquote className="mt-2 rounded-md border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                                    {answer.answerText?.trim() || 'Keine Antwort abgegeben.'}
                                  </blockquote>
                                )}
                                <p className="mt-2 text-xs font-bold text-slate-400">
                                  {answer.pointsAwarded}/{answer.maxPoints} Punkte
                                </p>
                                {attempt.needsReview && answer.questionType === 'open' && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Label className="text-xs font-bold text-slate-600">Punkte (0-{answer.maxPoints})</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={answer.maxPoints}
                                      className="h-8 w-24"
                                      value={gradeDrafts[attempt.id]?.[answer.questionId] ?? answer.pointsAwarded ?? 0}
                                      onChange={(e) => {
                                        const value = Math.min(Math.max(0, Number(e.target.value || 0)), answer.maxPoints)
                                        setGradeDrafts((current) => ({
                                          ...current,
                                          [attempt.id]: { ...current[attempt.id], [answer.questionId]: value },
                                        }))
                                      }}
                                      disabled={gradingAttemptId === attempt.id}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {attempt.needsReview && (
                          <div className="flex justify-end">
                            <Button
                              onClick={() => saveGrades(attempt)}
                              disabled={gradingAttemptId === attempt.id}
                              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {gradingAttemptId === attempt.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              )}
                              Bewertung speichern
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
