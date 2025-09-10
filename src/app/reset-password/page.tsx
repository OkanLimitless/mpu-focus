'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/user/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Passwort zurücksetzen</CardTitle>
          <CardDescription>Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, erhalten Sie einen Link zum Zurücksetzen.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-sm text-gray-700">Wenn ein Konto existiert, wurde eine E-Mail versendet.</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Senden…' : 'Link senden'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

