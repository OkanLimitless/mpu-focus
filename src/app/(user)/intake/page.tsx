'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/components/providers/i18n-provider'

export default function IntakePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<any>({
    incident_summary: '',
    substance_and_frequency: '',
    bac_or_values: '',
    abstinence_or_controlled_use: '',
    therapy_or_support: '',
    behavior_change_steps: '',
    risk_situations_and_strategies: '',
    support_network: '',
    motivation_to_change: '',
    goals_and_next_steps: '',
  })
  const steps = [
    { key: 'incident_summary', label: t('q_incident_summary'), hint: t('hint_incident_summary') },
    { key: 'substance_and_frequency', label: t('q_substance_and_frequency'), hint: t('hint_substance_and_frequency') },
    { key: 'bac_or_values', label: t('q_bac_or_values'), hint: t('hint_bac_or_values') },
    { key: 'abstinence_or_controlled_use', label: t('q_abstinence_or_controlled_use'), hint: t('hint_abstinence_or_controlled_use') },
    { key: 'therapy_or_support', label: t('q_therapy_or_support'), hint: t('hint_therapy_or_support') },
    { key: 'behavior_change_steps', label: t('q_behavior_change_steps'), hint: t('hint_behavior_change_steps') },
    { key: 'risk_situations_and_strategies', label: t('q_risk_situations_and_strategies'), hint: t('hint_risk_situations_and_strategies') },
    { key: 'support_network', label: t('q_support_network'), hint: t('hint_support_network') },
    { key: 'motivation_to_change', label: t('q_motivation_to_change'), hint: t('hint_motivation_to_change') },
    { key: 'goals_and_next_steps', label: t('q_goals_and_next_steps'), hint: t('hint_goals_and_next_steps') },
  ] as const
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if (session.user.role === 'admin') { router.push('/admin'); return }
    ;(async () => {
      try {
        const res = await fetch('/api/quiz/intake')
        const data = await res.json()
        if (data?.intake?.responses) setForm((prev: any) => ({ ...prev, ...data.intake.responses }))
      } finally { setLoading(false) }
    })()
  }, [session, status, router])

  const save = async (complete = false) => {
    setSaving(true)
    try {
      await fetch('/api/quiz/intake', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ responses: form, complete }) })
      if (complete) setDone(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 rounded-full border-b-2 border-primary"/></div>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('baselineTitle')}</CardTitle>
            <CardDescription>{t('baselineSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <div className="space-y-3">
                <div className="text-sm text-green-700">{t('baselineSaved')}</div>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/quiz')}>{t('quizStartPractice')}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{t('stepOf', { current: idx+1, total: steps.length })}</span>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>{t('finishLater')}</Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{steps[idx].label}</label>
                  <Textarea rows={6} value={form[steps[idx].key]} onChange={(e) => setForm((f: any) => ({ ...f, [steps[idx].key]: e.target.value }))} />
                  {steps[idx].hint && <p className="text-xs text-gray-500">{steps[idx].hint}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { if (idx>0) setIdx(idx-1) }} disabled={idx===0 || saving}>{t('previous')}</Button>
                  {idx < steps.length - 1 ? (
                    <Button onClick={async () => { await save(false); setIdx(idx+1) }} disabled={saving}>{t('next')}</Button>
                  ) : (
                    <Button onClick={() => save(true)} disabled={saving}>{t('completeBaseline')}</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
