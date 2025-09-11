'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/components/providers/i18n-provider'
import { sections, labelFor, type Field, type Section as IntakeSection } from '@/lib/baseline-schema'

type BranchKey = 'alcohol' | 'cannabis' | 'drugs' | 'points' | 'aggression' | 'medical'

function get(obj: any, path: string[]): any {
  return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj)
}
function set(obj: any, path: string[], value: any): any {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  return {
    ...obj,
    [head]: rest.length === 0 ? value : set(obj[head] || {}, rest, value),
  }
}

function stripValueWrappers(input: any): any {
  if (!input || typeof input !== 'object') return input
  if ('value' in input && Object.keys(input).length <= 2) return (input as any).value
  const out: any = Array.isArray(input) ? [] : {}
  for (const k of Object.keys(input)) {
    out[k] = stripValueWrappers((input as any)[k])
  }
  return out
}

export default function IntakePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, lang } = useI18n() as any
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<any>({})
  const [activeBranches, setActiveBranches] = useState<Record<BranchKey, boolean>>({ alcohol: false, cannabis: false, drugs: false, points: false, aggression: false, medical: false })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if (session.user.role === 'admin') { router.push('/admin'); return }
    ;(async () => {
      try {
        const res = await fetch('/api/quiz/intake')
        const data = await res.json()
        if (data?.intake?.responses) {
          const values = stripValueWrappers(data.intake.responses)
          setForm(values)
          // derive active branches from C2_violation_types if present
          const vtypes: string[] = get(values, ['C2_official_case_data','C2_violation_types']) || []
          setActiveBranches({
            alcohol: vtypes.includes('alcohol'),
            cannabis: vtypes.includes('cannabis'),
            drugs: vtypes.includes('drugs'),
            points: vtypes.includes('points'),
            aggression: vtypes.includes('aggression'),
            medical: vtypes.includes('medical'),
          })
        }
      } finally { setLoading(false) }
    })()
  }, [session, status, router])

  // auto-sync branch toggles when violation types change
  useEffect(() => {
    const vtypes: string[] = get(form, ['C2_official_case_data','C2_violation_types']) || []
    if (!vtypes) return
    setActiveBranches((prev) => ({
      ...prev,
      alcohol: vtypes.includes('alcohol'),
      cannabis: vtypes.includes('cannabis'),
      drugs: vtypes.includes('drugs'),
      points: vtypes.includes('points'),
      aggression: vtypes.includes('aggression'),
      medical: vtypes.includes('medical'),
    }))
  }, [form])

  const save = async (complete = false) => {
    setSaving(true)
    try {
      await fetch('/api/quiz/intake', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ responses: form, complete }) })
      if (complete) setDone(true)
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: Field, path: string[]) => {
    const label = labelFor(lang, field.label)
    const value = get(form, path)
    const setValue = (v: any) => setForm((f: any) => set(f, path, v))
    switch (field.type) {
      case 'long_text':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <Textarea rows={5} value={value || ''} onChange={(e) => setValue(e.target.value)} />
          </div>
        )
      case 'text':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <Input value={value || ''} onChange={(e) => setValue(e.target.value)} />
          </div>
        )
      case 'number':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <Input type="number" value={value ?? ''} onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        )
      case 'date':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <Input type="date" value={value || ''} onChange={(e) => setValue(e.target.value)} />
          </div>
        )
      case 'select_single':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <Select value={value || ''} onValueChange={(v) => setValue(v)}>
              <SelectTrigger>
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{labelFor(lang, opt.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'checkboxes':
        return (
          <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <div className="space-y-2">
              {field.options?.map((opt) => {
                const arr: string[] = Array.isArray(value) ? value : []
                const checked = arr.includes(opt.value)
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={() => {
                      const setv = new Set(arr)
                      checked ? setv.delete(opt.value) : setv.add(opt.value)
                      setValue(Array.from(setv))
                    }} />
                    <span>{labelFor(lang, opt.label)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      case 'date_list':
        return (
          <DateListEditor label={label} list={Array.isArray(value) ? value : []} onChange={setValue} />
        )
      case 'text_list':
        return (
          <TextListEditor label={label} list={Array.isArray(value) ? value : []} onChange={setValue} />
        )
      case 'multi':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">{label}</div>
            <div className="space-y-3">
              {field.fields?.map((sf) => (
                <div key={sf.id}>{renderField(sf, [...path, sf.id])}</div>
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const core = useMemo(() => sections.find(s => s.key === 'core') as IntakeSection, [])
  const branches = useMemo(() => sections.filter(s => s.key !== 'core') as IntakeSection[], [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 rounded-full border-b-2 border-primary"/></div>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('baselineTitle')}</CardTitle>
            <CardDescription>{t('baselineSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {done ? (
              <div className="space-y-3">
                <div className="text-sm text-green-700">{t('baselineSaved')}</div>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/quiz')}>{t('quizStartPractice')}</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Core Section */}
                <div className="space-y-4">
                  <div className="text-base font-semibold">{labelFor(lang, core.title)}</div>
                  <div className="space-y-4">
                    {core.items.map((f) => (
                      <div key={f.id} className="p-3 border rounded bg-white">{renderField(f, [f.id])}</div>
                    ))}
                  </div>
                </div>

                {/* Branch toggles */}
                <div className="space-y-3">
                  <div className="text-base font-semibold">Branch modules</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(branches as IntakeSection[]).map((b) => (
                      <label key={b.key as string} className="flex items-center gap-2 text-sm p-2 border rounded bg-white">
                        <Checkbox checked={activeBranches[b.key as BranchKey]} onCheckedChange={(v) => setActiveBranches((ab) => ({ ...ab, [b.key as BranchKey]: !!v }))} />
                        <span>{labelFor(lang, b.title)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Branch Sections */}
                <div className="space-y-6">
                  {branches.map((b) => (
                    activeBranches[b.key as BranchKey] ? (
                      <div key={b.key} className="space-y-3">
                        <div className="text-base font-semibold">{labelFor(lang, b.title)}</div>
                        <div className="space-y-4">
                          {b.items.map((f) => (
                            <div key={f.id} className="p-3 border rounded bg-white">{renderField(f, [f.id])}</div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => save(false)} disabled={saving}>{t('save') || 'Save'}</Button>
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

function TextListEditor({ label, list, onChange }: { label: string; list: string[]; onChange: (next: string[]) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input placeholder="https://..." value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) { onChange([...(list||[]), value.trim()]); setValue('') } } }} />
        <Button variant="outline" onClick={() => { if (value.trim()) { onChange([...(list||[]), value.trim()]); setValue('') } }}>Add</Button>
      </div>
      <div className="space-y-1">
        {(list || []).map((item, i) => (
          <div key={i} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
            <span className="truncate">{item}</span>
            <Button size="sm" variant="ghost" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>×</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function DateListEditor({ label, list, onChange }: { label: string; list: string[]; onChange: (next: string[]) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button variant="outline" onClick={() => { if (value) { onChange([...(list||[]), value]); setValue('') } }}>Add</Button>
      </div>
      <div className="space-y-1">
        {(list || []).map((item, i) => (
          <div key={i} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
            <span className="truncate">{item}</span>
            <Button size="sm" variant="ghost" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>×</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
