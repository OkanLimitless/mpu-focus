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
              <>
                {Object.entries({
                  incident_summary: t('q_incident_summary'),
                  substance_and_frequency: t('q_substance_and_frequency'),
                  bac_or_values: t('q_bac_or_values'),
                  abstinence_or_controlled_use: t('q_abstinence_or_controlled_use'),
                  therapy_or_support: t('q_therapy_or_support'),
                  behavior_change_steps: t('q_behavior_change_steps'),
                  risk_situations_and_strategies: t('q_risk_situations_and_strategies'),
                  support_network: t('q_support_network'),
                  motivation_to_change: t('q_motivation_to_change'),
                  goals_and_next_steps: t('q_goals_and_next_steps'),
                }).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium">{label}</label>
                    <Textarea rows={4} value={form[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => save(false)} disabled={saving}>{t('save')}</Button>
                  <Button onClick={() => save(true)} disabled={saving}>{t('completeBaseline')}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

