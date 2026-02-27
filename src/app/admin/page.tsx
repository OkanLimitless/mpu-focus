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
  ChevronRight,
  Settings,
  LogOut,
  LayoutDashboard,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const leadStatusConfig: Record<LeadStatus, { label: string; class: string }> = {
  new: { label: 'Neu', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  contacted: { label: 'Kontaktiert', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  enrolled: { label: 'Eingeschrieben', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  closed: { label: 'Abgeschlossen', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

function formatDate(value?: string) {
  if (!value) return 'Unbekannt'
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

      if (!statsRes.ok) throw new Error(statsPayload?.error || 'Stats konnten nicht geladen werden')
      if (!leadsRes.ok) throw new Error(leadsPayload?.error || 'Leads konnten nicht geladen werden')
      if (!videosRes.ok) throw new Error(videosPayload?.error || 'Videos konnten nicht geladen werden')

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
      setError(err?.message || 'Fehler beim Laden der Admin-Daten')
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
      if (!response.ok) throw new Error(payload?.error || 'Lead-Update fehlgeschlagen')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Lead-Update fehlgeschlagen')
    } finally {
      setSavingLeadId(null)
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
      if (!response.ok) throw new Error(payload?.error || 'Video-Update fehlgeschlagen')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Video-Update fehlgeschlagen')
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
      if (!response.ok) throw new Error(payload?.error || 'Video konnte nicht gelöscht werden')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Video konnte nicht gelöscht werden')
    } finally {
      setBusyVideoId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-premium-dark text-white")}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-primary/20 bg-slate-900/50 backdrop-blur-xl">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className={cn(displayFont.className, "text-xl font-medium tracking-widest uppercase opacity-50")}>Initialisiere System...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !isAdmin) {
    return (
      <div className={cn(bodyFont.className, "flex min-h-screen items-center justify-center bg-premium-dark px-4 py-10")}>
        <div className="card-layer w-full max-w-md p-10 text-center shadow-premium bg-card/40">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/20">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h1 className={cn(displayFont.className, "mb-4 text-3xl font-bold text-white tracking-tight")}>Zugriff verweigert</h1>
          <p className="mb-8 text-slate-500 font-medium italic">Dieser Bereich ist ausschließlich für Administratoren reserviert.</p>
          <div className="space-y-4">
            <Link href="/login" className="block">
              <Button className="h-14 w-full rounded-2xl bg-white text-slate-950 text-lg font-bold hover:bg-white/90 shadow-xl transition-all active:scale-[0.98]">
                Zum Login
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="ghost" className="h-14 w-full rounded-2xl text-slate-500 hover:bg-white/5 hover:text-white transition-all">
                Abbrechen
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(bodyFont.className, "flex min-h-screen bg-premium-dark text-slate-200")}>
      {/* Premium Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 z-50 h-screen w-80 border-r border-white/[0.04] bg-card/30 backdrop-blur-3xl shadow-2xl">
        <div className="flex h-full flex-col p-8">
          <div className="mb-12 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/10">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className={cn(displayFont.className, "text-xl font-bold text-white tracking-tight")}>MPU-Focus</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Admin Center</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => setActiveTab('crm')}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl px-6 py-4 font-semibold transition-all",
                activeTab === 'crm' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Users className={cn("h-5 w-5", activeTab === 'crm' ? "text-primary" : "text-slate-500 group-hover:text-primary")} />
              Lead Management
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl px-6 py-4 font-semibold transition-all",
                activeTab === 'videos' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Clapperboard className={cn("h-5 w-5", activeTab === 'videos' ? "text-primary" : "text-slate-500 group-hover:text-primary")} />
              Video Akademie
            </button>
          </nav>

          <div className="mt-auto space-y-4 pt-10 border-t border-white/[0.04]">
            <div className="flex items-center gap-4 px-2">
              <div className="h-10 w-10 rounded-xl bg-card border border-white/10 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Okan&background=2563eb&color=fff" alt="Avatar" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">Okan</p>
                <p className="truncate text-[10px] text-slate-500 uppercase tracking-wider font-bold">System Admin</p>
              </div>
              <button onClick={logoutAdmin} className="text-slate-500 hover:text-red-400 transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="ml-0 md:ml-80 flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 custom-scrollbar pb-32 md:pb-10">
        <header className="mb-8 md:mb-12 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={cn(displayFont.className, "text-4xl font-bold text-white md:text-5xl tracking-tight text-gradient-premium")}>
              {activeTab === 'crm' ? 'Lead' : 'Video'} <span className="text-primary italic">Zentrale</span>
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-500">Willkommen zurück in Ihrem Command Center.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white transition-all shadow-sm">
              <Bell className="h-5 w-5 text-slate-500" />
            </Button>
            <Button
              onClick={loadAll}
              disabled={loading}
              className="h-12 gap-3 rounded-2xl bg-white text-slate-950 hover:bg-white/90 px-6 font-bold shadow-xl transition-all active:scale-95"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Dynamic Mesh Gradients */}
        <div className="pointer-events-none fixed left-80 top-0 -z-10 h-full w-full overflow-hidden opacity-30">
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-20 right-20 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        {/* Stats Grid */}
        <section className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-7">
          {[
            { label: 'Total Leads', val: stats.totalLeads, icon: Users, color: 'text-primary' },
            { label: 'Neu', val: stats.newLeads, icon: Circle, color: 'text-blue-400' },
            { label: 'Kontaktiert', val: stats.contactedLeads, icon: UserRound, color: 'text-amber-400' },
            { label: 'Eingeschrieben', val: stats.enrolledLeads, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Videos', val: stats.publishedVideos, icon: Clapperboard, color: 'text-cyan-400' },
          ].map((s, idx) => (
            <div key={idx} className="card-layer group relative p-6 transition-all hover:border-white/20 hover:bg-card/60">
              <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.08]", s.color)}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
              <p className={cn(displayFont.className, "mt-1 text-3xl font-bold text-white")}>{s.val}</p>
            </div>
          ))}
        </section>

        {/* CRM Content */}
        {activeTab === 'crm' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Filter Bar */}
            <div className="card-layer flex flex-col items-stretch md:flex-row md:items-center md:justify-between gap-6 p-6">
              <div className="relative flex-1 min-w-[200px] md:min-w-[400px]">
                <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Lead suchen..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(searchInput.trim())}
                  className="h-14 rounded-2xl border-white/[0.04] bg-white/[0.03] pl-16 text-white placeholder:text-slate-600 focus:ring-primary/20 focus:border-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Filter className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select
                    className="h-14 rounded-2xl border border-white/[0.04] bg-white/[0.03] pl-12 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                  >
                    <option value="all">Alle Stati</option>
                    {Object.keys(leadStatusConfig).map((s) => (
                      <option key={s} value={s}>{leadStatusConfig[s as LeadStatus].label}</option>
                    ))}
                  </select>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/10 px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm">
                  {leads.length} Leads
                </Badge>
              </div>
            </div>

            {/* Leads List */}
            <div className="grid gap-6">
              {leads.map((lead) => (
                <div key={lead._id} className="card-layer group p-5 md:p-8 transition-all hover:bg-card/60">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-6 flex-1 min-w-0">
                      <div className="flex flex-row items-center gap-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] group-hover:scale-105 transition-all shadow-inner">
                          <UserRound className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className={cn(displayFont.className, "text-xl md:text-2xl font-bold text-white truncate text-gradient-premium")}>
                            {lead.firstName} {lead.lastName}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3">
                            <Badge className={cn("px-4 py-1 rounded-full font-bold text-[10px] uppercase tracking-[0.15em] border transition-all", leadStatusConfig[lead.status].class)}>
                              {leadStatusConfig[lead.status].label}
                            </Badge>
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-slate-600" />
                              Erstellt am {formatDate(lead.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 transition-all hover:bg-white/[0.05] shadow-sm">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Email</p>
                            <p className="truncate font-semibold text-white/90 text-sm">{lead.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 transition-all hover:bg-white/[0.05] shadow-sm">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                            <Phone className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Telefon</p>
                            <p className="font-semibold text-white/90 text-sm">{lead.phone}</p>
                          </div>
                        </div>
                      </div>

                      {lead.goals && (
                        <div className="relative rounded-2xl bg-white/[0.01] p-5 italic text-slate-400 border border-white/[0.04] shadow-inner text-sm leading-relaxed">
                          <p className="relative z-10">"{lead.goals}"</p>
                        </div>
                      )}
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-col gap-6 lg:w-80">
                      <div className="space-y-2">
                        <p className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status aktualisieren</p>
                        <div className="relative">
                          <select
                            className="h-12 w-full rounded-xl border border-white/[0.08] bg-card/[0.5] px-5 text-sm font-bold text-white/90 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                            value={lead.status}
                            onChange={(e) => updateLead(lead._id, { status: e.target.value as LeadStatus })}
                          >
                            <option value="new">Neu</option>
                            <option value="contacted">Kontaktiert</option>
                            <option value="enrolled">Eingeschrieben</option>
                            <option value="closed">Abgeschlossen</option>
                          </select>
                          <ChevronRight className="absolute right-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Textarea
                          rows={3}
                          placeholder="Interne Notiz hinterlegen..."
                          value={notesDrafts[lead._id] || ''}
                          onChange={(e) =>
                            setNotesDrafts((prev) => ({
                              ...prev,
                              [lead._id]: e.target.value,
                            }))
                          }
                          className="rounded-2xl border-white/[0.08] bg-white/[0.01] p-4 text-sm text-white placeholder:text-slate-600 focus:ring-primary/20 shadow-inner resize-none custom-scrollbar"
                        />
                        <Button
                          onClick={() => updateLead(lead._id, { notes: notesDrafts[lead._id] || '' })}
                          disabled={savingLeadId === lead._id}
                          className="h-12 w-full rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-white/90 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          {savingLeadId === lead._id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Speichern'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!leads.length && (
                <div className="card-layer border-dashed border-white/[0.08] flex flex-col items-center justify-center py-40 bg-white/[0.01]">
                  <div className="mb-8 h-20 w-20 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-inner">
                    <Search className="h-8 w-8 text-slate-700" />
                  </div>
                  <h3 className={cn(displayFont.className, "text-2xl font-bold text-white tracking-tight")}>Keine Ergebnisse</h3>
                  <p className="mt-2 text-slate-500 font-medium">Verfeinern Sie Ihre Suche oder ändern Sie den Filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Similar high-fidelity treatment for Video section */}
            <div className="card-layer p-16 text-center border-dashed border-white/[0.08] bg-white/[0.01]">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <Clapperboard className="h-8 w-8 text-slate-700" />
              </div>
              <h2 className={cn(displayFont.className, "text-2xl font-bold text-white tracking-tight")}>Video Akademie</h2>
              <p className="text-slate-500 mt-2 font-medium">Dieser Bereich wird gerade für das neue Design-System optimiert.</p>
              <Button variant="outline" className="mt-10 rounded-2xl border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] transition-all px-8 h-12" onClick={() => setActiveTab('crm')}>
                Zurück zum CRM
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 glass-dark border-t border-white/10 p-4 pb-safe flex items-center justify-around shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] bg-slate-950/90 backdrop-blur-2xl">
        <button
          onClick={() => setActiveTab('crm')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] uppercase tracking-wider font-black transition-all",
            activeTab === 'crm' ? "text-primary scale-110" : "text-slate-500 hover:text-white"
          )}
        >
          <Users className="h-6 w-6 mb-1" />
          Leads
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] uppercase tracking-wider font-black transition-all",
            activeTab === 'videos' ? "text-primary scale-110" : "text-slate-500 hover:text-white"
          )}
        >
          <Clapperboard className="h-6 w-6 mb-1" />
          Videos
        </button>
        <button
          onClick={logoutAdmin}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] uppercase tracking-wider font-black text-slate-500 hover:text-red-400 transition-all"
        >
          <LogOut className="h-6 w-6 mb-1" />
          Logout
        </button>
      </nav>

      {error && (
        <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 z-[100] animate-in slide-in-from-bottom-5 md:slide-in-from-right duration-500">
          <div className="card-layer h-auto min-w-[300px] md:min-w-[400px] border-red-500/20 p-6 bg-red-950/20 backdrop-blur-3xl shadow-2xl">
            <div className="flex items-start gap-5">
              <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-500 text-white shrink-0 shadow-lg shadow-red-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">System Alert</p>
                <p className="mt-1 font-semibold text-red-100 text-sm md:text-base leading-relaxed">{error}</p>
                <button onClick={() => setError(null)} className="mt-4 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors">Schließen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

