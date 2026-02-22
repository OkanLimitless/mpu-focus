'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
          source: 'home-page',
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-8 md:p-12">
          <p className="uppercase text-xs tracking-[0.2em] text-blue-100 mb-3">MPU Focus</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-3xl">
            Teaching Platform + CRM for Signups
          </h1>
          <p className="mt-4 text-blue-100 max-w-2xl">
            The project is now focused on video-based learning and lead management. No passport/document verification is required during signup.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/learn">
              <Button className="bg-white text-blue-700 hover:bg-blue-50">Open Learning Library</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" className="border-white text-white hover:bg-white/10">Open CRM Admin</Button>
            </Link>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle>Signup Intake</CardTitle>
              <CardDescription>New leads are stored in Supabase and shown in the CRM dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Goals / context (optional)"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={4}
                />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Submit Signup'}
                </Button>
                {submitted && <p className="text-sm text-green-700">Signup submitted. The CRM has been updated.</p>}
                {error && <p className="text-sm text-red-700">{error}</p>}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Changed</CardTitle>
              <CardDescription>The platform has been transformed around teaching + CRM operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>1. Signup flow now writes to Supabase (`mpu_signups`).</p>
              <p>2. Learning library pulls videos from Supabase (`mpu_video_library`).</p>
              <p>3. Admin CRM manages leads and videos in one dashboard.</p>
              <p>4. Verification/document workflow is no longer required for intake.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
