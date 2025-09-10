"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Command = {
  id: string
  title: string
  subtitle?: string
  action: () => void
}

export default function CommandPalette({
  context = 'user',
}: { context?: 'user' | 'admin' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const base: Command[] = [
    { id: 'home', title: 'Home', action: () => router.push('/') },
    { id: 'dashboard', title: 'Dashboard', action: () => router.push('/dashboard') },
    { id: 'learn', title: 'Learn', action: () => router.push('/learn') },
    { id: 'beratung', title: 'Beratung', action: () => router.push('/beratung') },
  ]

  const admin: Command[] = [
    { id: 'admin', title: 'Admin', action: () => router.push('/admin') },
    { id: 'admin-users', title: 'Admin • Users', action: () => router.push('/admin?section=users') },
    { id: 'admin-leads', title: 'Admin • Leads', action: () => router.push('/admin?section=leads') },
    { id: 'admin-verification', title: 'Admin • Verification', action: () => router.push('/admin?section=verification') },
    { id: 'admin-chapters', title: 'Admin • Modules', action: () => router.push('/admin?section=chapters') },
  ]

  const commands = useMemo(() => (context === 'admin' ? [...base, ...admin] : base), [context])
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return commands
    return commands.filter((c) => c.title.toLowerCase().includes(ql))
  }, [q, commands])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <div className="border-b p-3">
          <Input
            autoFocus
            placeholder="Type to search (⌘/Ctrl+K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No commands found</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  setOpen(false)
                  setQ('')
                  cmd.action()
                }}
                className="w-full text-left p-3 border-b hover:bg-gray-50 focus:outline-none"
              >
                <div className="font-medium">{cmd.title}</div>
                {cmd.subtitle && <div className="text-xs text-gray-500">{cmd.subtitle}</div>}
              </button>
            ))
          )}
        </div>
        <div className="p-2 text-right border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

