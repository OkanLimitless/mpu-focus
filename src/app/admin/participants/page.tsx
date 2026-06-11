'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Participant = {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  academyAccessEnabled: boolean
  academyAccessSupported?: boolean
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
  academyAccessSupported?: boolean
}

type ParticipantDetail = {
  participant: {
    id: string
    firstName: string
    lastName: string
    email: string
    isActive: boolean
    academyAccessEnabled: boolean
    createdAt: string
  }
  videoProgress: {
    totalVideos: number
    completedVideos: number
    videos: Array<{
      videoId: string
      title: string
      chapterTitle: string | null
      categoryTitle: string | null
      durationSeconds: number | null
      completionPercentage: number
      isCompleted: boolean
      lastPositionSeconds: number | null
      lastActivityAt: string | null
    }>
  }
  quizProgress: {
    totalQuizzes: number
    passedQuizzes: number
    attempts: Array<{
      id: string
      quizId: string
      quizTitle: string
      score: number
      maxScore: number
      percentage: number
      passed: boolean | null
      needsReview: boolean
      completedAt: string | null
    }>
  }
  finance: {
    packagePriceCents: number | null
    paidCents: number
    outstandingCents: number
    financeNotes: string | null
    payments: Array<{
      id: string
      amountCents: number
      method: string | null
      note: string | null
      paidAt: string | null
    }>
  }
  agreement: {
    id: string
    status: 'pending' | 'submitted' | 'approved' | 'rejected'
    fullName: string | null
    birthDate: string | null
    address: string | null
    signedAt: string | null
    signedIp: string | null
    signatureData: string | null
    idDocumentUrl: string | null
    idDocumentName: string | null
    contractVersion: number | string | null
    contractText: string | null
    rejectionReason: string | null
    reviewedAt: string | null
  } | null
}

type AgreementTemplate = {
  title: string
  text: string
  version: number | string
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

function formatShortDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatEuro(cents?: number | null) {
  if (cents === null || cents === undefined) return '-'
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function agreementStatusBadge(status?: 'pending' | 'submitted' | 'approved' | 'rejected' | null) {
  switch (status) {
    case 'submitted':
      return <Badge variant="info">Eingereicht</Badge>
    case 'approved':
      return <Badge variant="success">Bestätigt</Badge>
    case 'rejected':
      return <Badge variant="destructive">Abgelehnt</Badge>
    default:
      return <Badge variant="warning">Ausstehend</Badge>
  }
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

  // Participant detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailParticipantId, setDetailParticipantId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ParticipantDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAllVideos, setShowAllVideos] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [agreementBusy, setAgreementBusy] = useState(false)

  // Agreement template dialog
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateVersion, setTemplateVersion] = useState<number | string | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateText, setTemplateText] = useState('')

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
    if (participant.academyAccessSupported === false) {
      toast({
        title: 'Freigabe nicht verfügbar',
        description: 'Die Datenbank muss zuerst das Feld academy_access_enabled enthalten.',
        variant: 'destructive',
      })
      return
    }

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

  const loadDetail = useCallback(async (participantId: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/admin/participants/${participantId}/progress`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Die Details konnten nicht geladen werden.')
      }
      setDetail(payload as ParticipantDetail)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Details konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  const openDetail = (participant: Participant) => {
    setDetailParticipantId(participant.id)
    setDetail(null)
    setShowAllVideos(false)
    setRejecting(false)
    setRejectionReason('')
    setDetailOpen(true)
    loadDetail(participant.id)
  }

  const reviewAgreement = async (status: 'approved' | 'rejected') => {
    if (!detail?.agreement) return
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast({
        title: 'Begründung erforderlich',
        description: 'Bitte geben Sie eine Begründung für die Ablehnung an.',
        variant: 'destructive',
      })
      return
    }

    setAgreementBusy(true)
    try {
      const response = await fetch(`/api/admin/agreements/${detail.agreement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          status === 'rejected'
            ? { status, rejectionReason: rejectionReason.trim() }
            : { status }
        ),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Die Vereinbarung konnte nicht aktualisiert werden.')
      }

      toast({
        title: status === 'approved' ? 'Vereinbarung bestätigt' : 'Vereinbarung abgelehnt',
        description: status === 'approved'
          ? 'Der Teilnehmer wurde über die Bestätigung informiert.'
          : 'Der Teilnehmer kann die Vereinbarung erneut einreichen.',
      })
      setRejecting(false)
      setRejectionReason('')
      if (detailParticipantId) {
        await loadDetail(detailParticipantId)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Vereinbarung konnte nicht aktualisiert werden.',
        variant: 'destructive',
      })
    } finally {
      setAgreementBusy(false)
    }
  }

  const openTemplateDialog = async () => {
    setTemplateOpen(true)
    setTemplateLoading(true)
    try {
      const response = await fetch('/api/admin/agreement-template', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Der Vertragstext konnte nicht geladen werden.')
      }
      const template: AgreementTemplate | undefined = payload?.template
      setTemplateTitle(template?.title || '')
      setTemplateText(template?.text || '')
      setTemplateVersion(template?.version ?? null)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Vertragstext konnte nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setTemplateLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!templateTitle.trim() || !templateText.trim()) {
      toast({
        title: 'Angaben unvollständig',
        description: 'Titel und Vertragstext dürfen nicht leer sein.',
        variant: 'destructive',
      })
      return
    }

    setTemplateSaving(true)
    try {
      const response = await fetch('/api/admin/agreement-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: templateTitle.trim(), text: templateText }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Der Vertragstext konnte nicht gespeichert werden.')
      }
      setTemplateVersion(payload?.template?.version ?? templateVersion)
      toast({
        title: 'Vertragstext gespeichert',
        description: 'Eine neue Version wurde automatisch erstellt.',
      })
      setTemplateOpen(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Der Vertragstext konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setTemplateSaving(false)
    }
  }

  const visibleDetailVideos = detail
    ? (showAllVideos ? detail.videoProgress.videos : detail.videoProgress.videos.slice(0, 8))
    : []

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
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={openTemplateDialog}
            variant="outline"
            className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Vertragstext
          </Button>
          <Button
            onClick={loadParticipants}
            disabled={loading}
            variant="outline"
            className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
          >
            Aktualisieren
          </Button>
        </div>
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
                    {participant.academyAccessSupported === false
                      ? 'Freigabe nicht konfiguriert'
                      : participant.academyAccessEnabled && participant.isActive
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
                  disabled={busyParticipantId === participant.id || !participant.isActive || participant.academyAccessSupported === false}
                  className={cn(
                    'min-w-[220px] rounded-xl font-bold',
                    participant.academyAccessEnabled
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                >
                  {busyParticipantId === participant.id
                    ? 'Wird gespeichert...'
                    : participant.academyAccessSupported === false
                      ? 'Schema-Update erforderlich'
                      : participant.academyAccessEnabled
                      ? 'Akademiezugang entziehen'
                      : 'Akademiezugang freigeben'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openDetail(participant)}
                  className="min-w-[220px] rounded-xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"
                >
                  Details
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
                  <span>
                    {participant.academyAccessSupported === false
                      ? 'Freigabe nicht konfiguriert'
                      : participant.academyAccessEnabled
                        ? 'Zugang aktiv'
                        : 'Zugang noch nicht freigegeben'}
                  </span>
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

      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setDetail(null); setDetailParticipantId(null) } }}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-900')}>
              {detail
                ? `${detail.participant.firstName} ${detail.participant.lastName}`
                : 'Teilnehmerdetails'}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.participant.email} · Registriert am ${formatShortDate(detail.participant.createdAt)}`
                : 'Fortschritt, Finanzen und Vereinbarung des Teilnehmers.'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="text-sm font-semibold">Details werden geladen...</span>
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, 'text-base font-bold text-slate-900')}>Lernfortschritt</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {detail.videoProgress.completedVideos} von {detail.videoProgress.totalVideos} Videos abgeschlossen
                    </p>
                  </div>
                </div>

                {detail.videoProgress.videos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Noch keine Videoaktivität vorhanden.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visibleDetailVideos.map((video) => (
                      <div key={video.videoId} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {video.isCompleted && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                              )}
                              <p className="truncate text-sm font-bold text-slate-900">{video.title}</p>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {[video.categoryTitle, video.chapterTitle].filter(Boolean).join(' · ') || 'Ohne Kapitel'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-xs font-semibold text-slate-500">
                            <p className="text-sm font-bold text-slate-900">{Math.round(video.completionPercentage)}%</p>
                            <p>{video.lastActivityAt ? formatShortDate(video.lastActivityAt) : 'Keine Aktivität'}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full transition-all', video.isCompleted ? 'bg-emerald-500' : 'bg-blue-600')}
                            style={{ width: `${Math.max(0, Math.min(100, Math.round(video.completionPercentage)))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {detail.videoProgress.videos.length > 8 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl border-slate-200 font-semibold text-slate-600"
                        onClick={() => setShowAllVideos((current) => !current)}
                      >
                        {showAllVideos
                          ? 'Weniger anzeigen'
                          : `Alle anzeigen (${detail.videoProgress.videos.length})`}
                      </Button>
                    )}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, 'text-base font-bold text-slate-900')}>Wissenstests</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {detail.quizProgress.passedQuizzes} von {detail.quizProgress.totalQuizzes} Tests bestanden
                    </p>
                  </div>
                </div>

                {detail.quizProgress.attempts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Noch keine Testversuche vorhanden.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.quizProgress.attempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{attempt.quizTitle}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {formatShortDate(attempt.completedAt)} · {Math.round(attempt.percentage)}%
                          </p>
                        </div>
                        {attempt.needsReview || attempt.passed === null ? (
                          <Badge variant="warning">Wird bewertet</Badge>
                        ) : attempt.passed ? (
                          <Badge variant="success">Bestanden</Badge>
                        ) : (
                          <Badge variant="destructive">Nicht bestanden</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={cn(displayFont.className, 'text-base font-bold text-slate-900')}>Finanzen</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Zahlungen erfassen Sie unter Finanzen.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Paketpreis', value: formatEuro(detail.finance.packagePriceCents), tone: 'text-slate-900' },
                    { label: 'Bezahlt', value: formatEuro(detail.finance.paidCents), tone: 'text-emerald-600' },
                    { label: 'Offen', value: formatEuro(detail.finance.outstandingCents), tone: detail.finance.outstandingCents > 0 ? 'text-amber-600' : 'text-slate-900' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                      <p className={cn(displayFont.className, 'mt-1 text-lg font-bold tracking-tight', item.tone)}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {detail.finance.financeNotes && (
                  <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {detail.finance.financeNotes}
                  </p>
                )}

                {detail.finance.payments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {detail.finance.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{formatEuro(payment.amountCents)}</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                            {formatShortDate(payment.paidAt)}
                            {payment.note ? ` · ${payment.note}` : ''}
                          </p>
                        </div>
                        {payment.method && <Badge variant="muted">{payment.method}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h3 className={cn(displayFont.className, 'text-base font-bold text-slate-900')}>Vereinbarung</h3>
                  </div>
                  {agreementStatusBadge(detail.agreement?.status)}
                </div>

                {!detail.agreement ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Der Teilnehmer hat die Betreuungsvereinbarung noch nicht eingereicht.
                  </p>
                ) : (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Name</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{detail.agreement.fullName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Geburtsdatum</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{formatShortDate(detail.agreement.birthDate)}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Anschrift</p>
                        <p className="mt-0.5 whitespace-pre-line text-sm font-semibold text-slate-700">{detail.agreement.address || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Vertragsversion</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{detail.agreement.contractVersion ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Unterzeichnet</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">{formatShortDate(detail.agreement.signedAt)}</p>
                        {detail.agreement.signedIp && (
                          <p className="text-[11px] text-slate-400">IP: {detail.agreement.signedIp}</p>
                        )}
                      </div>
                    </div>

                    {detail.agreement.signatureData && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Unterschrift</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detail.agreement.signatureData}
                          className="h-20 rounded-lg border bg-white p-2"
                          alt="Unterschrift"
                        />
                      </div>
                    )}

                    {detail.agreement.idDocumentUrl && (
                      <a
                        href={detail.agreement.idDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Ausweisdokument öffnen
                        {detail.agreement.idDocumentName && (
                          <span className="font-semibold text-slate-400">({detail.agreement.idDocumentName})</span>
                        )}
                      </a>
                    )}

                    {detail.agreement.status === 'rejected' && detail.agreement.rejectionReason && (
                      <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        Ablehnungsgrund: {detail.agreement.rejectionReason}
                      </p>
                    )}

                    {detail.agreement.status === 'submitted' && (
                      <div className="border-t border-slate-100 pt-4">
                        {rejecting ? (
                          <div className="space-y-3">
                            <Label htmlFor="rejectionReason" className="text-sm font-bold text-slate-700">
                              Begründung für die Ablehnung
                            </Label>
                            <Textarea
                              id="rejectionReason"
                              rows={3}
                              value={rejectionReason}
                              onChange={(event) => setRejectionReason(event.target.value)}
                              placeholder="z. B. Ausweisdokument unleserlich, bitte erneut hochladen."
                              className="rounded-xl border-slate-200"
                            />
                            <div className="flex flex-wrap gap-3">
                              <Button
                                onClick={() => reviewAgreement('rejected')}
                                disabled={agreementBusy || !rejectionReason.trim()}
                                className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
                              >
                                {agreementBusy ? 'Wird gespeichert...' : 'Ablehnung bestätigen'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => { setRejecting(false); setRejectionReason('') }}
                                disabled={agreementBusy}
                                className="rounded-xl"
                              >
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() => reviewAgreement('approved')}
                              disabled={agreementBusy}
                              className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                            >
                              {agreementBusy ? 'Wird gespeichert...' : 'Bestätigen'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setRejecting(true)}
                              disabled={agreementBusy}
                              className="rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50"
                            >
                              Ablehnen
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-900')}>
              Vertragstext bearbeiten
            </DialogTitle>
            <DialogDescription>
              Aktuelle Version: {templateVersion ?? '-'} &mdash; Änderungen erzeugen automatisch eine neue Version.
            </DialogDescription>
          </DialogHeader>

          {templateLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="text-sm font-semibold">Vertragstext wird geladen...</span>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="templateTitle" className="text-sm font-bold text-slate-700">Titel</Label>
                <Input
                  id="templateTitle"
                  value={templateTitle}
                  onChange={(event) => setTemplateTitle(event.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateText" className="text-sm font-bold text-slate-700">Vertragstext</Label>
                <Textarea
                  id="templateText"
                  rows={16}
                  value={templateText}
                  onChange={(event) => setTemplateText(event.target.value)}
                  className="rounded-xl border-slate-200 font-mono text-sm leading-6"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setTemplateOpen(false)}
                  disabled={templateSaving}
                  className="rounded-xl"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={saveTemplate}
                  disabled={templateSaving}
                  className="rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700"
                >
                  {templateSaving ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
