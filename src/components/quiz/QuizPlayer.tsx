'use client'

import { useEffect, useState } from 'react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  CheckSquare,
  Circle,
  CircleDot,
  Clock,
  ListChecks,
  Loader2,
  MessageSquare,
  PenLine,
  RefreshCw,
  Send,
  Square,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

type QuizOption = {
  id: string
  text: string
}

type QuizQuestion = {
  id: string
  question: string
  questionType: 'multiple_choice' | 'open'
  points: number
  orderIndex: number
  multipleCorrect: boolean
  options: QuizOption[]
}

type QuizDetail = {
  id: string
  title: string
  description: string | null
  passPercentage: number
  questions: QuizQuestion[]
}

type AnswerState = {
  selectedOptionIds: string[]
  answerText: string
}

type ResultAnswer = {
  questionId: string
  questionType: 'multiple_choice' | 'open'
  isCorrect: boolean | null
  pointsAwarded: number
  maxPoints: number
  needsReview: boolean
  selectedOptionIds: string[] | null
  correctOptionIds: string[] | null
  explanation: string | null
}

type SubmitResult = {
  attemptId: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean | null
  needsReview: boolean
  passPercentage: number
  answers: ResultAnswer[]
}

type QuizPlayerProps = {
  quizId: string
  onClose: () => void
  onFinished: () => void
}

export default function QuizPlayer({ quizId, onClose, onFinished }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const loadQuiz = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Der Test konnte nicht geladen werden.')
      }
      const loaded: QuizDetail = payload?.quiz
      if (!loaded || !Array.isArray(loaded.questions)) {
        throw new Error('Der Test konnte nicht geladen werden.')
      }
      loaded.questions = [...loaded.questions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      setQuiz(loaded)
      setCurrentIndex(0)
      setAnswers({})
      setResult(null)
      setSubmitError(null)
      setConfirmingSubmit(false)
      setStartedAt(new Date().toISOString())
    } catch (err: any) {
      setError(err?.message || 'Der Test konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuiz()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  const questions = quiz?.questions || []
  const currentQuestion = questions[currentIndex] || null

  const isAnswered = (question: QuizQuestion) => {
    const answer = answers[question.id]
    if (!answer) return false
    if (question.questionType === 'open') return answer.answerText.trim().length > 0
    return answer.selectedOptionIds.length > 0
  }

  const unansweredCount = questions.filter((question) => !isAnswered(question)).length

  const toggleOption = (question: QuizQuestion, optionId: string) => {
    setAnswers((current) => {
      const previous = current[question.id] || { selectedOptionIds: [], answerText: '' }
      let selectedOptionIds: string[]
      if (question.multipleCorrect) {
        selectedOptionIds = previous.selectedOptionIds.includes(optionId)
          ? previous.selectedOptionIds.filter((id) => id !== optionId)
          : [...previous.selectedOptionIds, optionId]
      } else {
        selectedOptionIds = previous.selectedOptionIds.includes(optionId) ? [] : [optionId]
      }
      return { ...current, [question.id]: { ...previous, selectedOptionIds } }
    })
  }

  const setAnswerText = (question: QuizQuestion, answerText: string) => {
    setAnswers((current) => {
      const previous = current[question.id] || { selectedOptionIds: [], answerText: '' }
      return { ...current, [question.id]: { ...previous, answerText } }
    })
  }

  const submitQuiz = async () => {
    if (!quiz || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payloadAnswers = quiz.questions.map((question) => {
        const answer = answers[question.id]
        if (question.questionType === 'open') {
          return { questionId: question.id, answerText: answer?.answerText?.trim() || '' }
        }
        return { questionId: question.id, selectedOptionIds: answer?.selectedOptionIds || [] }
      })
      const response = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payloadAnswers, startedAt }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.result) {
        throw new Error(payload?.error || 'Ihre Antworten konnten nicht übermittelt werden.')
      }
      setResult(payload.result as SubmitResult)
      setConfirmingSubmit(false)
      onFinished()
    } catch (err: any) {
      setSubmitError(err?.message || 'Ihre Antworten konnten nicht übermittelt werden.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitClick = () => {
    if (unansweredCount > 0 && !confirmingSubmit) {
      setConfirmingSubmit(true)
      return
    }
    submitQuiz()
  }

  if (loading) {
    return (
      <section className={cn(bodyFont.className, 'flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-10 shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <p className={cn(displayFont.className, 'mt-5 text-sm font-bold uppercase tracking-[0.18em] text-slate-500')}>
          Test wird geladen...
        </p>
      </section>
    )
  }

  if (error || !quiz) {
    return (
      <section className={cn(bodyFont.className, 'flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Test konnte nicht geladen werden</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{error || 'Bitte versuchen Sie es erneut.'}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button className="rounded-lg bg-slate-950 px-6 font-bold text-white hover:bg-slate-800" onClick={loadQuiz}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
          <Button variant="outline" className="rounded-lg border-slate-200 px-6 font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Zurück zur Übersicht
          </Button>
        </div>
      </section>
    )
  }

  if (result) {
    const inReview = result.needsReview || result.passed === null
    const passed = result.passed === true

    return (
      <section className={cn(bodyFont.className, 'rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
        <div className="border-b border-slate-200/80 p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ergebnis</p>
          <h2 className={cn(displayFont.className, 'mt-1 text-2xl font-bold tracking-tight text-slate-950')}>{quiz.title}</h2>
        </div>

        <div className="p-5 md:p-6">
          <div
            className={cn(
              'rounded-2xl border p-6 text-center md:p-8',
              inReview
                ? 'border-amber-200 bg-amber-50'
                : passed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50',
            )}
          >
            <p
              className={cn(
                displayFont.className,
                'text-5xl font-bold md:text-6xl',
                inReview ? 'text-amber-700' : passed ? 'text-emerald-700' : 'text-red-700',
              )}
            >
              {Math.round(result.percentage)}%
            </p>
            <p className="mt-2 text-sm font-bold text-slate-700">
              {result.score} von {result.maxScore} Punkten
            </p>
            <div className="mt-4 flex justify-center">
              {inReview ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Wird noch bewertet
                </span>
              ) : passed ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  Bestanden
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-700">
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Nicht bestanden
                </span>
              )}
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
              {inReview
                ? 'Einige Ihrer Antworten werden von Ihrem Coach persönlich bewertet. Sobald die Bewertung abgeschlossen ist, sehen Sie hier Ihr endgültiges Ergebnis.'
                : passed
                  ? `Herzlichen Glückwunsch! Sie haben die Bestehensgrenze von ${result.passPercentage}% erreicht.`
                  : `Sie haben die Bestehensgrenze von ${result.passPercentage}% leider nicht erreicht. Sie können den Test jederzeit wiederholen.`}
            </p>
          </div>

          <div className="mt-7">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <ListChecks className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Ihre Antworten im Überblick
            </h3>
            <div className="space-y-4">
              {questions.map((question, index) => {
                const answerResult = result.answers.find((entry) => entry.questionId === question.id)
                const selectedIds = answerResult?.selectedOptionIds || answers[question.id]?.selectedOptionIds || []
                const correctIds = answerResult?.correctOptionIds || []
                const isOpen = question.questionType === 'open'
                const stateIcon = answerResult?.needsReview || answerResult?.isCorrect === null
                  ? <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  : answerResult?.isCorrect
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    : <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />

                return (
                  <div key={question.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {stateIcon}
                        <p className="text-sm font-bold text-slate-950">
                          {index + 1}. {question.question}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-slate-500">
                        {answerResult ? `${answerResult.pointsAwarded}/${answerResult.maxPoints}` : `0/${question.points}`} Pkt.
                      </span>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ihre Antwort</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {answers[question.id]?.answerText?.trim() || 'Keine Antwort abgegeben.'}
                          </p>
                        </div>
                        {(answerResult?.needsReview || answerResult?.isCorrect === null) && (
                          <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                            Diese Antwort wird von Ihrem Coach bewertet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {question.options.map((option) => {
                          const isCorrectOption = correctIds.includes(option.id)
                          const isSelected = selectedIds.includes(option.id)
                          return (
                            <div
                              key={option.id}
                              className={cn(
                                'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm',
                                isCorrectOption
                                  ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-800'
                                  : isSelected
                                    ? 'border-red-200 bg-red-50 font-semibold text-red-700'
                                    : 'border-slate-200 bg-white text-slate-600',
                              )}
                            >
                              <span>{option.text}</span>
                              <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                                {isSelected && <span className={isCorrectOption ? 'text-emerald-700' : 'text-red-600'}>Ihre Auswahl</span>}
                                {isCorrectOption && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {answerResult?.explanation && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Erklärung</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{answerResult.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 rounded-lg bg-blue-600 px-6 font-bold text-white hover:bg-blue-700"
              onClick={loadQuiz}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Erneut versuchen
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-lg border-slate-200 px-6 font-bold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const progressPercent = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0
  const isLastQuestion = currentIndex === questions.length - 1
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined

  return (
    <section className={cn(bodyFont.className, 'rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]')}>
      <div className="border-b border-slate-200/80 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Wissenstest</p>
            <h2 className={cn(displayFont.className, 'mt-1 truncate text-2xl font-bold tracking-tight text-slate-950')}>
              {quiz.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zurück zur Übersicht
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Frage {currentIndex + 1} von {questions.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {currentQuestion ? (
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className={cn(displayFont.className, 'text-lg font-bold leading-7 text-slate-950 md:text-xl')}>
              {currentQuestion.question}
            </h3>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'Punkt' : 'Punkte'}
            </span>
          </div>

          {currentQuestion.questionType === 'multiple_choice' ? (
            <div className="mt-5">
              {currentQuestion.multipleCorrect && (
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  Mehrere Antworten möglich
                </p>
              )}
              <div className="grid gap-3" role={currentQuestion.multipleCorrect ? 'group' : 'radiogroup'}>
                {currentQuestion.options.map((option) => {
                  const isSelected = (currentAnswer?.selectedOptionIds || []).includes(option.id)
                  const SelectedIcon = currentQuestion.multipleCorrect
                    ? (isSelected ? CheckSquare : Square)
                    : (isSelected ? CircleDot : Circle)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role={currentQuestion.multipleCorrect ? 'checkbox' : 'radio'}
                      aria-checked={isSelected}
                      onClick={() => toggleOption(currentQuestion, option.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold transition-all',
                        isSelected
                          ? 'border-blue-300 bg-blue-50 text-slate-950 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <SelectedIcon
                        className={cn('h-5 w-5 shrink-0', isSelected ? 'text-blue-600' : 'text-slate-300')}
                        aria-hidden="true"
                      />
                      <span className="leading-6">{option.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <Textarea
                value={currentAnswer?.answerText || ''}
                onChange={(event) => setAnswerText(currentQuestion, event.target.value)}
                placeholder="Schreiben Sie hier Ihre Antwort..."
                className="min-h-[160px] rounded-xl border-slate-200 bg-slate-50 text-sm leading-6 text-slate-900 focus-visible:ring-blue-600"
              />
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                Ihre Antwort wird von Ihrem Coach bewertet.
              </p>
            </div>
          )}

          {confirmingSubmit && unansweredCount > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-slate-950">
                    {unansweredCount === 1
                      ? '1 Frage ist unbeantwortet. Trotzdem abgeben?'
                      : `${unansweredCount} Fragen sind unbeantwortet. Trotzdem abgeben?`}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Unbeantwortete Fragen werden mit 0 Punkten gewertet.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg bg-slate-950 font-bold text-white hover:bg-slate-800"
                      onClick={submitQuiz}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
                      Trotzdem abgeben
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-slate-200 font-bold text-slate-700 hover:bg-white"
                      onClick={() => setConfirmingSubmit(false)}
                      disabled={submitting}
                    >
                      Weiter bearbeiten
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">{submitError}</p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-5">
            <Button
              variant="outline"
              className="h-11 rounded-lg border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setConfirmingSubmit(false)
                setCurrentIndex((index) => Math.max(0, index - 1))
              }}
              disabled={currentIndex === 0 || submitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Zurück
            </Button>

            {isLastQuestion ? (
              <Button
                className="h-11 rounded-lg bg-blue-600 px-6 font-bold text-white hover:bg-blue-700"
                onClick={handleSubmitClick}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Antworten abgeben
              </Button>
            ) : (
              <Button
                className="h-11 rounded-lg bg-blue-600 px-6 font-bold text-white hover:bg-blue-700"
                onClick={() => {
                  setConfirmingSubmit(false)
                  setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))
                }}
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-slate-600">Dieser Test enthält noch keine Fragen.</p>
          <Button
            variant="outline"
            className="mt-5 rounded-lg border-slate-200 px-6 font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Zurück zur Übersicht
          </Button>
        </div>
      )}
    </section>
  )
}
