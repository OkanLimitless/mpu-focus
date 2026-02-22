'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import { signOut, useSession } from 'next-auth/react'
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
      <div className={`${bodyFont.className} min-h-screen bg-[#e9eef5] px-4 py-10`}>
        <Card className="mx-auto max-w-xl rounded-3xl border-slate-200 bg-white/95 shadow-xl">
          <CardContent className="py-12 text-center text-slate-600">Checking admin session...</CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className={`${bodyFont.className} min-h-screen bg-[#e9eef5] px-4 py-10`}>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-8 text-white shadow-2xl">
            <p className="mb-3 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs tracking-wide">
              Private control center
            </p>
            <h1 className={`${displayFont.className} text-4xl leading-tight md:text-5xl`}>
              CRM + Learning Admin
            </h1>
            <p className="mt-4 max-w-md text-cyan-50/95">
              Admin key login has been removed. Use your Supabase account at `/login`, then open `/admin`.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-cyan-50/90">
              <Badge className="border-white/25 bg-white/10 text-white">Lead workflow</Badge>
              <Badge className="border-white/25 bg-white/10 text-white">Video publishing</Badge>
              <Badge className="border-white/25 bg-white/10 text-white">Supabase live data</Badge>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 bg-white/95 shadow-xl">
            <CardHeader>
              <CardTitle className={`${displayFont.className} text-2xl`}>Admin Access</CardTitle>
              <CardDescription>
                Sign in first, then this page opens automatically for `admin` users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/login">
                  <Button className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                    Go to Login
                  </Button>
                </Link>
                <Link href="/" className="block text-center text-sm text-slate-500 hover:text-slate-800">
                  Back to landing page
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
      <div className={`${bodyFont.className} min-h-screen bg-[#e9eef5] px-4 py-10`}>
        <Card className="mx-auto max-w-xl rounded-3xl border-amber-200 bg-amber-50/80 shadow-lg">
          <CardHeader>
            <CardTitle className={`${displayFont.className} text-2xl text-amber-900`}>Admin Role Required</CardTitle>
            <CardDescription className="text-amber-800">
              Your account is authenticated but does not have `admin` role in `mpu_profiles`.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={logoutAdmin}>
              Sign out
            </Button>
            <Link href="/">
              <Button variant="outline" className="rounded-xl border-slate-300">
                Back to landing page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`${bodyFont.className} min-h-screen bg-[#edf2f8] text-slate-900`}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-6 text-white shadow-2xl md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -top-20 right-8 h-56 w-56 rounded-full bg-cyan-300/40 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-blue-300/30 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs tracking-wide">
                Control Room
              </p>
              <h1 className={`${displayFont.className} text-3xl leading-tight md:text-5xl`}>
                Teaching CRM Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-cyan-50/90">
                Monitor signup pipeline, update lead statuses, and publish video lessons from one workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={loadAll}
                disabled={loading}
                className="h-10 rounded-xl border border-white/35 bg-white/10 text-white hover:bg-white/20"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                {loading ? 'Refreshing' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-white/35 bg-white text-slate-900 hover:bg-slate-100"
                onClick={logoutAdmin}
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {statCards.map((item) => (
            <Card key={item.title} className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="p-4">
                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.tone} text-white`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-500">{item.title}</p>
                <p className={`${displayFont.className} text-2xl leading-none`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={activeTab === 'crm' ? 'default' : 'ghost'}
              className={cn(
                'h-11 rounded-xl',
                activeTab === 'crm' && 'bg-slate-900 text-white hover:bg-slate-800',
              )}
              onClick={() => setActiveTab('crm')}
            >
              <Users className="mr-2 h-4 w-4" />
              CRM
            </Button>
            <Button
              type="button"
              variant={activeTab === 'videos' ? 'default' : 'ghost'}
              className={cn(
                'h-11 rounded-xl',
                activeTab === 'videos' && 'bg-slate-900 text-white hover:bg-slate-800',
              )}
              onClick={() => setActiveTab('videos')}
            >
              <Clapperboard className="mr-2 h-4 w-4" />
              Videos
            </Button>
          </div>
        </section>

        {error && (
          <Card className="mt-4 border-red-200 bg-red-50">
            <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        {activeTab === 'crm' && (
          <section className="mt-4 space-y-4">
            <Card className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_140px]">
                  <form
                    className="relative"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setAppliedSearch(searchInput.trim())
                    }}
                  >
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or phone"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-11 rounded-xl border-slate-300 pl-9"
                    />
                  </form>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                    >
                      <option value="all">All statuses</option>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-slate-300"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Reload
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <Badge className="border-slate-200 bg-slate-100 text-slate-700">{filteredLeadsCount} loaded</Badge>
                  {appliedSearch && (
                    <button
                      type="button"
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700"
                      onClick={() => {
                        setSearchInput('')
                        setAppliedSearch('')
                      }}
                    >
                      Search: {appliedSearch} (clear)
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {leads.map((lead) => (
                <Card key={lead._id} className="rounded-2xl border-slate-200">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`${displayFont.className} text-xl text-slate-900`}>
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <Badge className={cn('border', leadStatusBadgeClass[lead.status])}>
                              {leadStatusLabels[lead.status]}
                            </Badge>
                            {lead.source && <Badge variant="outline">{lead.source}</Badge>}
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-slate-600">
                            <p className="inline-flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="truncate">{lead.email}</span>
                            </p>
                            <p className="inline-flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {lead.phone}
                            </p>
                            <p className="text-xs text-slate-500">Created: {formatDate(lead.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[190px]">
                          <select
                            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={lead.status}
                            onChange={(e) => updateLead(lead._id, { status: e.target.value as LeadStatus })}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="enrolled">Enrolled</option>
                            <option value="closed">Closed</option>
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl border-slate-300"
                            onClick={() => updateLead(lead._id, { notes: notesDrafts[lead._id] || '' })}
                            disabled={savingLeadId === lead._id}
                          >
                            {savingLeadId === lead._id ? 'Saving...' : 'Save Notes'}
                          </Button>
                        </div>
                      </div>

                      {lead.goals && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                          {lead.goals}
                        </div>
                      )}

                      <Textarea
                        rows={3}
                        placeholder="Add notes for this lead"
                        value={notesDrafts[lead._id] || ''}
                        onChange={(e) =>
                          setNotesDrafts((prev) => ({
                            ...prev,
                            [lead._id]: e.target.value,
                          }))
                        }
                        className="rounded-xl border-slate-300"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!leads.length && (
                <Card className="rounded-2xl border-dashed border-slate-300 bg-white">
                  <CardContent className="py-10 text-center text-sm text-slate-600">
                    No signups found for the current filter.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {activeTab === 'videos' && (
          <section className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr] lg:items-start">
            <Card className="rounded-2xl border-slate-200 lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className={`${displayFont.className} text-2xl`}>Create Lesson Video</CardTitle>
                <CardDescription>Add a new item to your public learning library.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={createVideo}>
                  <Input
                    placeholder="Title"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-11 rounded-xl border-slate-300"
                    required
                  />
                  <Input
                    placeholder="Video URL"
                    value={newVideo.videoUrl}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, videoUrl: e.target.value }))}
                    className="h-11 rounded-xl border-slate-300"
                    required
                  />
                  <Input
                    placeholder="Thumbnail URL (optional)"
                    value={newVideo.thumbnailUrl}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                    className="h-11 rounded-xl border-slate-300"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Category"
                      value={newVideo.category}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, category: e.target.value }))}
                      className="h-11 rounded-xl border-slate-300"
                    />
                    <Input
                      type="number"
                      placeholder="Order"
                      value={newVideo.orderIndex}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, orderIndex: Number(e.target.value || 0) }))}
                      className="h-11 rounded-xl border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Duration sec"
                      value={newVideo.durationSeconds}
                      onChange={(e) => setNewVideo((prev) => ({ ...prev, durationSeconds: e.target.value }))}
                      className="h-11 rounded-xl border-slate-300"
                    />
                    <select
                      className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                      value={newVideo.isPublished ? 'published' : 'draft'}
                      onChange={(e) =>
                        setNewVideo((prev) => ({
                          ...prev,
                          isPublished: e.target.value === 'published',
                        }))
                      }
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl border-slate-300"
                    rows={4}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                    disabled={creatingVideo}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {creatingVideo ? 'Creating...' : 'Create Video'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle className={`${displayFont.className} text-2xl`}>Video Library</CardTitle>
                <CardDescription>{videos.length} video(s) synced from Supabase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`${displayFont.className} text-xl leading-tight`}>{video.title}</h3>
                          <Badge className={video.isPublished ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                            {video.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline">{video.category}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{video.description || 'No description provided.'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1">Order: {video.orderIndex}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">Duration: {formatDuration(video.durationSeconds)}</span>
                          {video.updatedAt && (
                            <span className="rounded-full bg-slate-100 px-2 py-1">Updated: {formatDate(video.updatedAt)}</span>
                          )}
                        </div>
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center text-sm text-blue-700 hover:text-blue-900"
                        >
                          Open source URL
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-slate-300"
                          disabled={busyVideoId === video.id}
                          onClick={() => togglePublish(video)}
                        >
                          {video.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10 rounded-xl"
                          disabled={busyVideoId === video.id}
                          onClick={() => deleteVideo(video.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!videos.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                    No videos yet. Create your first lesson on the left.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
