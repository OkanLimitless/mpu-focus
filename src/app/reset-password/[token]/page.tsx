'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Passwort muss mindestens 6 Zeichen haben')
    if (password !== confirm) return setError('Passwörter stimmen nicht überein')
    setLoading(true)
    try {
      const res = await fetch('/api/user/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Fehler beim Zurücksetzen')
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 1500)
    } catch (e: any) {
      setError(e.message || 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Neues Passwort setzen</CardTitle>
          <CardDescription>Bitte geben Sie ein neues Passwort ein.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-sm text-green-700">Passwort aktualisiert. Weiterleitung…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Input type="password" required placeholder="Neues Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Input type="password" required placeholder="Passwort bestätigen" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Speichern…' : 'Passwort speichern'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

