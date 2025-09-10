'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/components/providers/i18n-provider'

type Q = {
  _id: string
  type: 'mcq'|'short'|'scenario'
  category: string
  difficulty: number
  prompt: string
  choices?: Array<{ key: string; text: string }>
}

export default function QuizPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [sessionId, setSessionId] = useState<string|undefined>()
  const [questions, setQuestions] = useState<Q[]>([])
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<any | null>(null)
  const [summary, setSummary] = useState<any | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const startTs = useRef<number>(0)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if (session.user.role === 'admin') { router.push('/admin'); return }
  }, [session, status, router])

  const started = !!sessionId && questions.length > 0
  const q = questions[idx]

  const toggleChoice = (key: string) => {
    if (!q) return
    const prev = answers[q._id] || []
    const set = new Set<string>(prev)
    set.has(key) ? set.delete(key) : set.add(key)
    setAnswers(a => ({ ...a, [q._id]: Array.from(set) }))
  }

  const submitAnswer = async () => {
    if (!q || !sessionId) return
    setBusy(true)
    try {
      const payload: any = { sessionId, questionId: q._id, timeSpentSec: Math.floor((Date.now() - startTs.current)/1000) }
      if (q.type === 'mcq') payload.answer = answers[q._id] || []
      if (q.type === 'short' || q.type === 'scenario') payload.answer = answers[q._id] || ''
      const res = await fetch('/api/quiz/session/answer', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) setFeedback(data.feedback || null)
    } finally {
      setBusy(false)
    }
  }

  const nextQuestion = () => {
    setFeedback(null)
    setIdx(i => Math.min(i+1, questions.length-1))
    startTs.current = Date.now()
  }

  const finishSession = async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      const res = await fetch('/api/quiz/session/finish', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ sessionId }) })
      const data = await res.json()
      if (data.success) setSummary(data)
    } finally {
      setBusy(false)
    }
  }

  const startPractice = async () => {
    setBusy(true)
    try {
      // sync profile
      await fetch('/api/quiz/profile/sync', { method: 'POST' })
      // ensure blueprint
      await fetch('/api/quiz/blueprint', { method: 'POST' })
      // start session
      const res = await fetch('/api/quiz/session/start', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ count: 10 }) })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.sessionId)
        setQuestions(data.questions)
        setIdx(0)
        setFeedback(null)
        setAnswers({})
        startTs.current = Date.now()
      }
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('quizTitle')}</CardTitle>
            <CardDescription>{t('quizSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!started && !summary ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">{t('quizInstructions')}</p>
                <Button onClick={startPractice} disabled={busy}>{t('quizStartPractice')}</Button>
              </div>
            ) : summary ? (
              <div className="space-y-3">
                <div className="text-sm">{t('quizOverallScore')}: <strong>{summary.score}%</strong> ({summary.itemsScored}/{summary.itemsTotal})</div>
                <div>
                  <div className="font-medium mb-1">{t('quizCategoryScores')}</div>
                  {summary.competencyScores && Object.keys(summary.competencyScores).length > 0 ? (
                    <ul className="list-disc ml-4 text-sm">
                      {Object.entries(summary.competencyScores).map(([k,v]: any) => (
                        <li key={k}><strong>{k}</strong>: {v}%</li>
                      ))}
                    </ul>
                  ) : <div className="text-sm text-gray-600">{t('noData')}</div>}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => { setSummary(null); setSessionId(undefined); setQuestions([]); }}>{t('quizStartPractice')}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">{t('quizProgress', { current: idx+1, total: questions.length })}</div>
                <div className="p-4 border rounded">
                  <div className="font-medium mb-2">{q.prompt}</div>
                  {q.type === 'mcq' && (
                    <div className="space-y-2">
                      {q.choices?.map((c) => (
                        <label key={c.key} className="flex items-center gap-2">
                          <Checkbox checked={(answers[q._id] || []).includes(c.key)} onCheckedChange={() => toggleChoice(c.key)} />
                          <span>{c.key}) {c.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {(q.type === 'short' || q.type === 'scenario') && (
                    <Textarea value={answers[q._id] || ''} onChange={(e) => setAnswers(a => ({ ...a, [q._id]: e.target.value }))} rows={5} placeholder={t('quizYourAnswer')} />
                  )}
                </div>
                {!feedback ? (
                  <div className="flex gap-2">
                    <Button onClick={submitAnswer} disabled={busy}>{t('quizSubmit')}</Button>
                    {idx < questions.length - 1 ? (
                      <Button variant="outline" onClick={nextQuestion}>{t('next')}</Button>
                    ) : (
                      <Button variant="outline" onClick={finishSession}>{t('quizFinish')}</Button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="font-medium mb-1">{t('quizFeedback')}</div>
                    {feedback?.rationales ? (
                      <ul className="list-disc ml-4 text-sm">
                        {Object.entries(feedback.rationales).map(([k,v]: any) => (
                          <li key={k}><strong>{k}:</strong> {String(v)}</li>
                        ))}
                      </ul>
                    ) : <div className="text-sm text-gray-600">{t('noData')}</div>}
                    <div className="mt-3 flex gap-2">
                      {idx < questions.length - 1 ? (
                        <Button onClick={nextQuestion}>{t('next')}</Button>
                      ) : (
                        <Button onClick={finishSession}>{t('quizFinish')}</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
