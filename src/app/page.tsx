'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import { ArrowRight, CheckCircle2, PlayCircle, UserRoundPlus, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function HomePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goals, setGoals] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          goals,
          source: 'landing-page',
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not submit your signup')
      }

      setSubmitted(true)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setGoals('')
    } catch (err: any) {
      setError(err?.message || 'Could not submit your signup')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${bodyFont.className} min-h-screen bg-[#edf2f7] text-slate-900`}>
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_60%)]" />
          <div className="absolute top-12 right-[-110px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.16),transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
          <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur md:px-6 animate-in fade-in-50 duration-500">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600" />
              <div>
                <p className={`${displayFont.className} text-sm font-semibold tracking-[0.18em] text-slate-700`}>MPU FOCUS</p>
                <p className="text-xs text-slate-500">Training + Lead CRM</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/learn">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">Learn</Button>
              </Link>
              <Link href="/admin">
                <Button size="sm" className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-100">Admin</Button>
              </Link>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#0f766e] to-[#0ea5e9] p-7 text-white shadow-2xl md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="mb-4 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
                New Direction: Clean learning platform
              </p>
              <h1 className={`${displayFont.className} max-w-3xl text-4xl font-bold leading-tight md:text-6xl`}>
                Learn Faster.
                <br />
                Manage Signups Better.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-cyan-50/95 md:text-lg">
                A focused teaching environment with a practical CRM for your incoming signups.
                Passport and document verification is removed from the signup flow.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/learn">
                  <Button className="h-11 rounded-xl bg-white px-5 text-slate-900 hover:bg-slate-100">
                    Explore Lessons
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button className="h-11 rounded-xl border border-white/45 bg-white/10 px-5 text-white hover:bg-white/20">
                    Open CRM
                  </Button>
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-cyan-100">Supabase-backed intake</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-cyan-100">Verification steps on signup</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-xs text-cyan-100">Unified page for lead capture</p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              <div className="mb-4">
                <p className={`${displayFont.className} text-2xl font-bold text-slate-900`}>Start A Signup</p>
                <p className="mt-1 text-sm text-slate-600">
                  Captured directly into your CRM table (`mpu_signups`).
                </p>
              </div>
              <form className="space-y-3" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-300"
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-300"
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-300"
                />
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-300"
                />
                <Textarea
                  placeholder="Goals / context (optional)"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={4}
                  className="rounded-xl border-slate-300"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  {submitting ? 'Submitting...' : 'Submit Signup'}
                </Button>
                {submitted && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Signup submitted. The CRM has been updated.
                  </div>
                )}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </form>
            </aside>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
              <Video className="h-5 w-5 text-teal-700" />
              <p className={`${displayFont.className} mt-3 text-lg font-semibold`}>Teaching First</p>
              <p className="mt-1 text-sm text-slate-600">
                Organize and publish lesson videos with clear categories and ordering.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
              <UserRoundPlus className="h-5 w-5 text-teal-700" />
              <p className={`${displayFont.className} mt-3 text-lg font-semibold`}>CRM Intake</p>
              <p className="mt-1 text-sm text-slate-600">
                Signups land in a usable CRM queue where status and notes are easy to update.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
              <PlayCircle className="h-5 w-5 text-teal-700" />
              <p className={`${displayFont.className} mt-3 text-lg font-semibold`}>Simple Flow</p>
              <p className="mt-1 text-sm text-slate-600">
                No verification bottleneck. Users can move from signup to learning immediately.
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <p className={`${displayFont.className} text-xl font-semibold`}>Operational Highlights</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> Signup data stored in `mpu_signups` (Supabase)</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> Video catalog served from `mpu_video_library`</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> Admin panel combines CRM + video publishing</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> Responsive across desktop and mobile</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
