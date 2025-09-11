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
  const [bullets, setBullets] = useState<Record<string, string[]>>({})
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
      if (q.type === 'short' || q.type === 'scenario') {
        const isBullet = /Stichpunkt/i.test(q.prompt) || /bullet/i.test(q.prompt)
        const text = isBullet ? (bullets[q._id] || []).map(s => s.trim()).filter(Boolean).map(s => `- ${s}`).join('\n') : (answers[q._id] || '')
        payload.answer = text
      }
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
      // gate: baseline must be completed
      const intakeRes = await fetch('/api/quiz/intake')
      const intakeData = await intakeRes.json().catch(() => ({}))
      if (!intakeData?.intake?.completedAt) {
        alert(t('baselineRequiredMsg') || 'Please complete your baseline intake first.')
        router.push('/intake')
        return
      }
      // sync profile
      await fetch('/api/quiz/profile/sync', { method: 'POST' })
      // ensure blueprint
      await fetch('/api/quiz/blueprint', { method: 'POST' })
      // start session
      const res = await fetch('/api/quiz/session/start', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ count: 12 }) })
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
                <div className="flex gap-2">
                  <Button onClick={startPractice} disabled={busy}>{t('quizStartPractice')}</Button>
                  <Button variant="outline" disabled={busy} onClick={async () => { 
                    // gate baseline
                    const intakeRes = await fetch('/api/quiz/intake')
                    const intakeData = await intakeRes.json().catch(() => ({}))
                    if (!intakeData?.intake?.completedAt) { alert(t('baselineRequiredMsg') || 'Please complete your baseline intake first.'); router.push('/intake'); return }
                    setBusy(true); try { await fetch('/api/quiz/blueprint', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ force: true }) }); await startPractice() } finally { setBusy(false) } }}>{t('regenerateSet') || 'Regenerate Set'}</Button>
                  <Button variant="outline" onClick={() => router.push('/intake')}>{t('startBaseline')}</Button>
                </div>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div className="text-sm">{t('quizOverallScore')}: <strong>{summary.score}%</strong> ({summary.itemsScored}/{summary.itemsTotal})</div>
                <div>
                  <div className="font-medium mb-2">{t('quizCategoryScores')}</div>
                  {summary.competencyScores && Object.keys(summary.competencyScores).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(summary.competencyScores).map(([k,v]: any) => (
                        <div key={k} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{categoryLabel(k)}</span>
                            <span>{v}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded">
                            <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.max(0, Math.min(100, Number(v)||0))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-sm text-gray-600">{t('noData')}</div>}
                </div>
                <Recommendations scores={summary.competencyScores || {}} />
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
                    /Stichpunkt/i.test(q.prompt) || /bullet/i.test(q.prompt) ? (
                      <BulletListEditor list={bullets[q._id] || []} onChange={(list) => setBullets(b => ({ ...b, [q._id]: list }))} />
                    ) : (
                      <Textarea value={answers[q._id] || ''} onChange={(e) => setAnswers(a => ({ ...a, [q._id]: e.target.value }))} rows={5} placeholder={t('quizYourAnswer')} />
                    )
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
                    ) : feedback?.feedback || (feedback?.strengths?.length || feedback?.gaps?.length || feedback?.actions?.length) ? (
                      <div className="space-y-2 text-sm text-gray-700">
                        {feedback?.feedback && <div>{String(feedback.feedback)}</div>}
                        {Array.isArray(feedback?.strengths) && feedback.strengths.length > 0 && (
                          <div>
                            <div className="font-medium">{t('strengths') || 'Stärken'}</div>
                            <ul className="list-disc ml-4">
                              {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(feedback?.gaps) && feedback.gaps.length > 0 && (
                          <div>
                            <div className="font-medium">{t('gaps') || 'Lücken'}</div>
                            <ul className="list-disc ml-4">
                              {feedback.gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(feedback?.actions) && feedback.actions.length > 0 && (
                          <div>
                            <div className="font-medium">{t('nextActions') || 'Nächste Schritte'}</div>
                            <ul className="list-disc ml-4">
                              {feedback.actions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">{t('noData')}</div>
                    )}
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

function categoryLabel(k: string) {
  switch (k) {
    case 'knowledge': return 'Knowledge'
    case 'insight': return 'Insight'
    case 'behavior': return 'Behavior'
    case 'consistency': return 'Consistency'
    case 'planning': return 'Planning'
    default: return k
  }
}

function Recommendations({ scores }: { scores: Record<string, number> }) {
  const { t } = useI18n()
  const [flags, setFlags] = useState<string[]>([])
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/quiz/profile')
        const data = await res.json()
        const rf = data?.profile?.riskFlags || []
        setFlags(rf)
      } catch {}
    })()
  }, [])
  const entries = Object.entries(scores)
  if (entries.length === 0) return null
  const sorted = [...entries].sort((a,b) => (a[1]||0) - (b[1]||0))
  const picks = sorted.slice(0, Math.min(2, sorted.length))
  const recs = picks.map(([cat]) => recommendForCategory(cat, flags))
  return (
    <div>
      <div className="font-medium mb-2">{t('quizRecommendations')}</div>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div key={i} className="border rounded p-2 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{categoryLabel(r.category)}</div>
              <div className="text-xs text-gray-600">{t('quizReviewMaterials')}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => r.path && (window.location.href = r.path)}>{t('goToModule')}</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function recommendForCategory(cat: string, flags: string[] = []): { category: string; path: string } {
  const alcohol = flags.includes('alcohol_case')
  const cannabis = flags.includes('cannabis_case')
  const points = flags.includes('points_case')
  const base = alcohol || cannabis ? '/learn/alcohol_drugs' : points ? '/learn/traffic_points' : '/learn'
  const map: Record<string, string> = {
    knowledge: points ? '/learn/traffic_points' : base,
    insight: base,
    behavior: base,
    consistency: base,
    planning: base,
  }
  return { category: cat, path: map[cat] || base }
}

function BulletListEditor({ list, onChange }: { list: string[]; onChange: (next: string[]) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="•" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) { onChange([...(list||[]), value.trim()]); setValue('') } } }} />
        <Button variant="outline" onClick={() => { if (value.trim()) { onChange([...(list||[]), value.trim()]); setValue('') } }}>Add</Button>
      </div>
      <div className="space-y-1">
        {(list || []).map((item, i) => (
          <div key={i} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
            <span className="truncate">- {item}</span>
            <Button size="sm" variant="ghost" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>×</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
