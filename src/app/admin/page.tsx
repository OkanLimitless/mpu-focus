'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import { signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/components/providers/i18n-provider'
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Clapperboard,
  ExternalLink,
  Filter,
  Lock,
  Mail,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type LeadStatus = 'new' | 'contacted' | 'enrolled' | 'closed'

type LeadItem = {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  goals?: string | null
  status: LeadStatus
  notes?: string | null
  source?: string | null
  createdAt: string
  updatedAt?: string
}

type VideoItem = {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl?: string | null
  durationSeconds?: number | null
  category: string
  orderIndex: number
  isPublished: boolean
  createdAt?: string
  updatedAt?: string
}

type Stats = {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  enrolledLeads: number
  closedLeads: number
  totalVideos: number
  publishedVideos: number
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const defaultStats: Stats = {
  totalLeads: 0,
  newLeads: 0,
  contactedLeads: 0,
  enrolledLeads: 0,
  closedLeads: 0,
  totalVideos: 0,
  publishedVideos: 0,
}

const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  enrolled: 'Enrolled',
  closed: 'Closed',
}

const leadStatusBadgeClass: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-amber-100 text-amber-800 border-amber-200',
  enrolled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-200 text-slate-700 border-slate-300',
}

function formatDate(value?: string) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'n/a'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default function AdminPage() {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [activeTab, setActiveTab] = useState<'crm' | 'videos'>('crm')

  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null)
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null)
  const [creatingVideo, setCreatingVideo] = useState(false)

  const [newVideo, setNewVideo] = useState({
    title: '',
    videoUrl: '',
    description: '',
    category: 'general',
    orderIndex: 0,
    thumbnailUrl: '',
    durationSeconds: '',
    isPublished: true,
  })

  const jsonHeaders = { 'Content-Type': 'application/json' }

  const loadAll = async () => {
    if (!isAdmin) return

    setLoading(true)
    setError(null)

    try {
      const leadsParams = new URLSearchParams({
        limit: '50',
        page: '1',
        status: statusFilter,
        search: appliedSearch,
      })

      const [statsRes, leadsRes, videosRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats', { cache: 'no-store' }),
        fetch(`/api/leads?${leadsParams.toString()}`, { cache: 'no-store' }),
        fetch('/api/admin/videos', { cache: 'no-store' }),
      ])

      const statsPayload = await statsRes.json().catch(() => ({}))
      const leadsPayload = await leadsRes.json().catch(() => ({}))
      const videosPayload = await videosRes.json().catch(() => ({}))

      if (!statsRes.ok) throw new Error(statsPayload?.error || 'Failed loading stats')
      if (!leadsRes.ok) throw new Error(leadsPayload?.error || 'Failed loading leads')
      if (!videosRes.ok) throw new Error(videosPayload?.error || 'Failed loading videos')

      const nextLeads = (leadsPayload.leads || []) as LeadItem[]
      const nextVideos = (videosPayload.videos || []) as VideoItem[]

      setStats(statsPayload.stats || defaultStats)
      setLeads(nextLeads)
      setVideos(nextVideos)
      setNotesDrafts((previous) => {
        const next: Record<string, string> = {}
        for (const lead of nextLeads) {
          next[lead._id] = previous[lead._id] ?? lead.notes ?? ''
        }
        return next
      })
    } catch (err: any) {
      setError(err?.message || 'Failed loading admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin, statusFilter, appliedSearch])

  const logoutAdmin = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const updateLead = async (leadId: string, patch: { status?: LeadStatus; notes?: string }) => {
    try {
      setSavingLeadId(leadId)
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify(patch),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update lead')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to update lead')
    } finally {
      setSavingLeadId(null)
    }
  }

  const createVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingVideo(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          title: newVideo.title,
          videoUrl: newVideo.videoUrl,
          description: newVideo.description,
          category: newVideo.category,
          orderIndex: Number(newVideo.orderIndex || 0),
          thumbnailUrl: newVideo.thumbnailUrl || null,
          durationSeconds: newVideo.durationSeconds ? Number(newVideo.durationSeconds) : null,
          isPublished: newVideo.isPublished,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to create video')

      setNewVideo({
        title: '',
        videoUrl: '',
        description: '',
        category: 'general',
        orderIndex: 0,
        thumbnailUrl: '',
        durationSeconds: '',
        isPublished: true,
      })

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to create video')
    } finally {
      setCreatingVideo(false)
    }
  }

  const togglePublish = async (video: VideoItem) => {
    try {
      setBusyVideoId(video.id)
      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ isPublished: !video.isPublished }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update video')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to update video')
    } finally {
      setBusyVideoId(null)
    }
  }

  const deleteVideo = async (videoId: string) => {
    try {
      setBusyVideoId(videoId)
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to delete video')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete video')
    } finally {
      setBusyVideoId(null)
    }
  }

  const filteredLeadsCount = leads.length

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      tone: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'New',
      value: stats.newLeads,
      icon: Circle,
      tone: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Contacted',
      value: stats.contactedLeads,
      icon: UserRound,
      tone: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Enrolled',
      value: stats.enrolledLeads,
      icon: CheckCircle2,
      tone: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Closed',
      value: stats.closedLeads,
      icon: Circle,
      tone: 'from-slate-500 to-slate-700',
    },
    {
      title: 'Videos',
      value: stats.totalVideos,
      icon: Clapperboard,
      tone: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Published',
      value: stats.publishedVideos,
      icon: BarChart3,
      tone: 'from-emerald-500 to-cyan-600',
    },
  ]

  if (status === 'loading') {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50")}>
        <div className="flex flex-col items-center gap-4 text-slate-800">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10")}>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-gradient-to-br from-primary via-blue-700 to-primary p-8 text-white shadow-2xl shadow-primary/20">
            <Badge variant="outline" className="mb-4 border-white/30 bg-white/10 text-white font-medium uppercase tracking-wider">
              Admin-Zentrale
            </Badge>
            <h1 className={cn(displayFont.className, "text-4xl leading-tight md:text-5xl font-bold")}>
              MPU-Focus <span className="text-accent italic">Admin</span>
            </h1>
            <p className="mt-4 max-w-md text-white/90 text-lg leading-relaxed">
              Bitte melden Sie sich an, um Zugriff auf die Lead-Verwaltung und Video-Akademie zu erhalten.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge className="border-white/25 bg-white/10 text-white">Lead Workflow</Badge>
              <Badge className="border-white/25 bg-white/10 text-white">Video Publishing</Badge>
              <Badge className="border-white/25 bg-white/10 text-white">Live-Daten</Badge>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 bg-white shadow-xl">
            <CardHeader className="pt-8 px-8">
              <CardTitle className={cn(displayFont.className, "text-2xl font-bold")}>Anmeldung erforderlich</CardTitle>
              <CardDescription className="text-slate-500 text-base">
                Dieser Bereich ist nur für autorisierte Administratoren zugänglich.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                <Link href="/login">
                  <Button className="h-12 w-full rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {t('signIn')}
                  </Button>
                </Link>
                <Link href="/" className="block text-center text-sm font-medium text-slate-400 hover:text-primary transition-colors">
                  {t('back')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10")}>
        <Card className="mx-auto max-w-xl rounded-3xl border-accent/20 bg-accent/5 shadow-lg">
          <CardHeader className="pt-8 px-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
              <Lock className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className={cn(displayFont.className, "text-2xl font-bold text-slate-900")}>Admin-Berechtigung erforderlich</CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Ihr Konto ist authentifiziert, verfügt aber nicht über die Administrator-Rolle.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col gap-3">
            <Button className="h-11 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold" onClick={logoutAdmin}>
              {t('logout')}
            </Button>
            <Link href="/">
              <Button variant="outline" className="h-11 w-full rounded-xl border-slate-200">
                Zurück zur Startseite
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, "min-h-screen bg-slate-50 text-slate-900 font-sans pb-20")}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-blue-800 to-primary p-6 text-white shadow-2xl shadow-primary/20 md:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -top-20 right-8 h-80 w-80 rounded-full bg-accent/30 blur-[100px]" />
            <div className="absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-blue-400/20 blur-[100px]" />
          </div>
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="border-white/30 bg-white/10 text-white px-4 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                MPU-Focus | <span className="text-accent-foreground font-black">Control Center</span>
              </Badge>
              <h1 className={cn(displayFont.className, "text-4xl leading-tight md:text-5xl lg:text-6xl font-black")}>
                Admin <span className="text-accent italic">Zentrale</span>
              </h1>
              <p className="max-w-xl text-white/80 text-lg md:text-xl font-medium leading-relaxed">
                Willkommen zurück, Okan. Verwalten Sie Leads, Kurse und Statistiken in Echtzeit.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={loadAll}
                className="h-12 gap-2 rounded-2xl bg-white px-6 font-bold text-primary hover:bg-white/95 transition-all hover:shadow-xl active:scale-95 shadow-lg shadow-white/10"
                disabled={loading}
              >
                <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
                Aktualisieren
              </Button>
              <Button
                variant="outline"
                onClick={logoutAdmin}
                className="h-12 gap-2 rounded-2xl border-white/30 bg-white/10 px-6 font-bold text-white hover:bg-white/20 transition-all active:scale-95"
              >
                {t('logout')}
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {statCards.map((item) => (
            <Card key={item.title} className="rounded-2xl border-slate-200 bg-white/95 shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.tone} text-white shadow-sm`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.title}</p>
                <p className={`${displayFont.className} mt-1 text-2xl font-bold leading-none text-slate-900`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={activeTab === 'crm' ? 'default' : 'ghost'}
              className={cn(
                'h-12 rounded-2xl font-bold transition-all',
                activeTab === 'crm' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50',
              )}
              onClick={() => setActiveTab('crm')}
            >
              <Users className="mr-2 h-5 w-5" />
              Lead Management
            </Button>
            <Button
              type="button"
              variant={activeTab === 'videos' ? 'default' : 'ghost'}
              className={cn(
                'h-12 rounded-2xl font-bold transition-all',
                activeTab === 'videos' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50',
              )}
              onClick={() => setActiveTab('videos')}
            >
              <Clapperboard className="mr-2 h-5 w-5" />
              Video Akademie
            </Button>
          </div>
        </section>

        {error && (
          <Card className="mt-6 border-red-200 bg-red-50/50 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 py-4 text-sm font-medium text-red-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">!</div>
              {error}
            </CardContent>
          </Card>
        )}

        {activeTab === 'crm' && (
          <section className="mt-8 space-y-6">
            <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-6 bg-slate-50/50">
                <div className="grid gap-4 lg:grid-cols-[1fr_240px_160px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Suche nach Name, E-Mail oder Telefon..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(searchInput.trim())}
                      className="h-12 rounded-2xl border-slate-200 bg-white pl-11 shadow-sm focus:ring-primary"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                    >
                      <option value="all">Alle Stati</option>
                      <option value="new">Neu</option>
                      <option value="contacted">Kontaktiert</option>
                      <option value="enrolled">Eingeschrieben</option>
                      <option value="closed">Abgeschlossen</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 bg-white font-bold shadow-sm hover:bg-slate-50"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Laden
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary text-white px-3 py-1 text-xs font-bold rounded-lg">{filteredLeadsCount} Leads geladen</Badge>
                  {appliedSearch && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                      onClick={() => {
                        setSearchInput('')
                        setAppliedSearch('')
                      }}
                    >
                      Suche: {appliedSearch} <span className="ml-1 opacity-50">✕</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {leads.map((lead) => (
                <Card key={lead._id} className="rounded-3xl border-slate-200 transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className={`${displayFont.className} text-2xl font-bold text-slate-900`}>
                            {lead.firstName} {lead.lastName}
                          </h3>
                          <Badge className={cn('px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider', leadStatusBadgeClass[lead.status])}>
                            {leadStatusLabels[lead.status]}
                          </Badge>
                          {lead.source && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-lg">
                              {lead.source}
                            </Badge>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <p className="inline-flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                            <Mail className="h-4 w-4 text-primary" />
                            <span className="truncate">{lead.email}</span>
                          </p>
                          <p className="inline-flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                            <Phone className="h-4 w-4 text-primary" />
                            {lead.phone}
                          </p>
                          <p className="inline-flex items-center gap-3 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-xl">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Erstellt: {formatDate(lead.createdAt)}
                          </p>
                        </div>
                        {lead.goals && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-700 leading-relaxed italic">
                            &ldquo;{lead.goals}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 min-w-[240px]">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status ändern</label>
                          <select
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:ring-2 focus:ring-primary"
                            value={lead.status}
                            onChange={(e) => updateLead(lead._id, { status: e.target.value as LeadStatus })}
                          >
                            <option value="new">Neu</option>
                            <option value="contacted">Kontaktiert</option>
                            <option value="enrolled">Eingeschrieben</option>
                            <option value="closed">Abgeschlossen</option>
                          </select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-xl border-slate-200 font-bold hover:bg-slate-50"
                          onClick={() => updateLead(lead._id, { notes: notesDrafts[lead._id] || '' })}
                          disabled={savingLeadId === lead._id}
                        >
                          {savingLeadId === lead._id ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                          )}
                          Notiz speichern
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Administrative Notizen</label>
                      <Textarea
                        rows={3}
                        placeholder="Interne Notizen zu diesem Lead hinzufügen..."
                        value={notesDrafts[lead._id] || ''}
                        onChange={(e) =>
                          setNotesDrafts((prev) => ({
                            ...prev,
                            [lead._id]: e.target.value,
                          }))
                        }
                        className="rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-primary resize-none p-4"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!leads.length && (
                <Card className="rounded-3xl border-dashed border-slate-300 bg-white">
                  <CardContent className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Keine Anmeldungen für den aktuellen Filter gefunden.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {activeTab === 'videos' && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
            <Card className="rounded-[2rem] border-slate-200 shadow-sm lg:sticky lg:top-8 bg-slate-50/30">
              <CardHeader className="pb-4">
                <CardTitle className={`${displayFont.className} text-2xl font-bold`}>Lektion erstellen</CardTitle>
                <CardDescription>Fügen Sie neue Inhalte zur Video-Akademie hinzu.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createVideo}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Titel</label>
                    <Input
                      placeholder="z.B. Einführung in die MPU"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, title: e.target.value }))}
                      className="h-12 rounded-2xl border-slate-200 bg-white px-4"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Video URL (Vimeo/YouTube)</label>
                    <Input
                      placeholder="https://..."
                      value={newVideo.videoUrl}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      className="h-12 rounded-2xl border-slate-200 bg-white px-4"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-1">Kategorie</label>
                      <Input
                        placeholder="Allgemein"
                        value={newVideo.category}
                        onChange={(e) => setNewVideo((prev) => ({ ...prev, category: e.target.value }))}
                        className="h-12 rounded-2xl border-slate-200 bg-white px-4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-1">Reihenfolge</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newVideo.orderIndex}
                        onChange={(e) => setNewVideo((prev) => ({ ...prev, orderIndex: Number(e.target.value || 0) }))}
                        className="h-12 rounded-2xl border-slate-200 bg-white px-4"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Status</label>
                    <select
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
                      value={newVideo.isPublished ? 'published' : 'draft'}
                      onChange={(e) =>
                        setNewVideo((prev) => ({
                          ...prev,
                          isPublished: e.target.value === 'published',
                        }))
                      }
                    >
                      <option value="published">Veröffentlicht</option>
                      <option value="draft">Entwurf</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Beschreibung</label>
                    <Textarea
                      placeholder="Worum geht es in dieser Lektion?"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, description: e.target.value }))}
                      className="rounded-2xl border-slate-200 bg-white p-4 resize-none"
                      rows={4}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                    disabled={creatingVideo}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    {creatingVideo ? 'Wird erstellt...' : 'Video hinzufügen'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className={`${displayFont.className} text-2xl font-bold`}>Video Mediathek</CardTitle>
                <CardDescription>{videos.length} Inhalte in der Akademie</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {videos.map((video) => (
                    <div key={video.id} className="p-6 transition-colors hover:bg-slate-50/50">
                      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className={`${displayFont.className} text-xl font-bold text-slate-900`}>{video.title}</h3>
                            <Badge className={cn('px-3 py-1 rounded-lg font-bold text-xs uppercase', video.isPublished ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                              {video.isPublished ? 'Live' : 'Entwurf'}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 bg-white font-bold rounded-lg text-slate-500">
                              {video.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{video.description || 'Keine Beschreibung vorhanden.'}</p>
                          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Position: {video.orderIndex}</span>
                            <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3 w-3" /> Dauer: {formatDuration(video.durationSeconds)}</span>
                            {video.updatedAt && (
                              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Zuletzt aktualisiert: {formatDate(video.updatedAt)}</span>
                            )}
                          </div>
                          <a
                            href={video.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-sm font-bold text-primary hover:text-blue-800 group"
                          >
                            Source ansehen
                            <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </a>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[160px]">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-slate-200 font-bold bg-white shadow-sm hover:bg-slate-50"
                            disabled={busyVideoId === video.id}
                            onClick={() => togglePublish(video)}
                          >
                            {video.isPublished ? 'Deaktivieren' : 'Aktivieren'}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-11 rounded-xl font-bold shadow-sm"
                            disabled={busyVideoId === video.id}
                            onClick={() => deleteVideo(video.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!videos.length && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Clapperboard className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">Noch keine Videos vorhanden. Erstellen Sie Ihre erste Lektion links.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
