'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Participant = {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  academyAccessEnabled: boolean
  createdAt: string
  updatedAt?: string | null
  progress: {
    totalVideos: number
    completedVideos: number
    averageProgress: number
    lastActivity?: string | null
  }
}

type ParticipantStats = {
  totalParticipants: number
  activeParticipants: number
  academyEnabledParticipants: number
  recentlyActiveParticipants: number
  publishedVideos: number
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDate(value?: string | null) {
  if (!value) return 'Noch keine Aktivität'
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type FilterValue = 'all' | 'enabled' | 'disabled' | 'inactive'

export default function ParticipantsPage() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<ParticipantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null)

  const loadParticipants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/admin/participants?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Teilnehmer konnten nicht geladen werden.')
      }

      setParticipants(payload.participants || [])
      setStats(payload.stats || null)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Teilnehmer konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    loadParticipants()
  }, [loadParticipants])

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      if (filter === 'enabled') return participant.academyAccessEnabled && participant.isActive
      if (filter === 'disabled') return !participant.academyAccessEnabled && participant.isActive
      if (filter === 'inactive') return !participant.isActive
      return true
    })
  }, [filter, participants])

  const toggleAcademyAccess = async (participant: Participant) => {
    try {
      setBusyParticipantId(participant.id)
      const response = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyAccessEnabled: !participant.academyAccessEnabled,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Der Plattformzugang konnte nicht geändert werden.')
      }

      setParticipants((current) => current.map((item) => (
        item.id === participant.id
          ? {
              ...item,
              academyAccessEnabled: payload.participant?.academyAccessEnabled ?? !participant.academyAccessEnabled,
            }
          : item
      )))

      setStats((current) => current ? {
        ...current,
        academyEnabledParticipants: current.academyEnabledParticipants + (participant.academyAccessEnabled ? -1 : 1),
      } : current)

      toast({
        title: participant.academyAccessEnabled ? 'Zugang entzogen' : 'Zugang freigegeben',
        description: `${participant.firstName} ${participant.lastName} ist jetzt ${participant.academyAccessEnabled ? 'nicht mehr' : ''} für die Akademie freigeschaltet.`.replace('  ', ' '),
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Plattformzugang konnte nicht geändert werden.',
        variant: 'destructive',
      })
    } finally {
      setBusyParticipantId(null)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-900')}>
              Teilnehmer
            </h1>
            <p className="font-medium text-slate-500">
              Echte Plattformnutzer mit Zugang und Lernfortschritt.
            </p>
          </div>
        </div>
        <Button
          onClick={loadParticipants}
          disabled={loading}
          variant="outline"
          className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
        >
          Aktualisieren
        </Button>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Teilnehmer gesamt', value: stats?.totalParticipants ?? '-', icon: Users, tone: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Zugang aktiv', value: stats?.academyEnabledParticipants ?? '-', icon: ShieldCheck, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Kürzlich aktiv', value: stats?.recentlyActiveParticipants ?? '-', icon: Clock3, tone: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Sichtbare Videos', value: stats?.publishedVideos ?? '-', icon: BookOpen, tone: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl border', card.tone)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className={cn(displayFont.className, 'mt-1 text-4xl font-bold tracking-tight text-slate-900')}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setSearch(searchInput)
            }}
            placeholder="Nach Name oder E-Mail suchen"
            className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { value: 'all', label: 'Alle' },
            { value: 'enabled', label: 'Zugang aktiv' },
            { value: 'disabled', label: 'Wartet auf Freigabe' },
            { value: 'inactive', label: 'Deaktiviert' },
          ].map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? 'default' : 'outline'}
              className="rounded-xl"
              onClick={() => setFilter(item.value as FilterValue)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setSearch(searchInput)}
          >
            Suchen
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {filteredParticipants.map((participant) => (
          <div key={participant.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-900')}>
                    {participant.firstName} {participant.lastName}
                  </h2>
                  <Badge variant={participant.academyAccessEnabled && participant.isActive ? 'success' : participant.isActive ? 'orange' : 'muted'}>
                    {participant.academyAccessEnabled && participant.isActive
                      ? 'Akademie freigeschaltet'
                      : participant.isActive
                        ? 'Wartet auf Freigabe'
                        : 'Deaktiviert'}
                  </Badge>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-500">{participant.email}</p>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>Erstellt am {formatDate(participant.createdAt)}</span>
                  <span>Letzte Aktivität: {formatDate(participant.progress.lastActivity)}</span>
                  <span>{participant.progress.completedVideos} von {participant.progress.totalVideos} Videos abgeschlossen</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  onClick={() => toggleAcademyAccess(participant)}
                  disabled={busyParticipantId === participant.id || !participant.isActive}
                  className={cn(
                    'min-w-[220px] rounded-xl font-bold',
                    participant.academyAccessEnabled
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                >
                  {busyParticipantId === participant.id
                    ? 'Wird gespeichert...'
                    : participant.academyAccessEnabled
                      ? 'Akademiezugang entziehen'
                      : 'Akademiezugang freigeben'}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Fortschritt</p>
                <p className={cn(displayFont.className, 'mt-3 text-4xl font-bold tracking-tight text-slate-900')}>
                  {participant.progress.averageProgress}%
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Durchschnitt über bereits gestartete Videos.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Lernfortschritt</span>
                  <span>{participant.progress.averageProgress}%</span>
                </div>
                <Progress value={participant.progress.averageProgress} className="h-3 bg-slate-200" />
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>{participant.progress.completedVideos} Videos abgeschlossen</span>
                  <span>{participant.progress.totalVideos} Videos sichtbar</span>
                  <span>{participant.academyAccessEnabled ? 'Zugang aktiv' : 'Zugang noch nicht freigegeben'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredParticipants.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className={cn(displayFont.className, 'text-xl font-bold text-slate-800')}>
              Keine Teilnehmer gefunden
            </h3>
            <p className="mt-2 text-slate-500">
              Für diese Auswahl gibt es aktuell keine passenden Plattformnutzer.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
