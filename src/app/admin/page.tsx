'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  createdAt: string
}

type VideoItem = {
  id: string
  title: string
  description: string | null
  videoUrl: string
  category: string
  orderIndex: number
  isPublished: boolean
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

const defaultStats: Stats = {
  totalLeads: 0,
  newLeads: 0,
  contactedLeads: 0,
  enrolledLeads: 0,
  closedLeads: 0,
  totalVideos: 0,
  publishedVideos: 0,
}

export default function AdminPage() {
  const [adminKeyInput, setAdminKeyInput] = useState('')
  const [adminKey, setAdminKey] = useState<string>('')
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [activeTab, setActiveTab] = useState<'crm' | 'videos'>('crm')

  const [newVideo, setNewVideo] = useState({
    title: '',
    videoUrl: '',
    description: '',
    category: 'general',
    orderIndex: 0,
  })

  useEffect(() => {
    const saved = localStorage.getItem('mpu_admin_key')
    if (saved) {
      setAdminKey(saved)
      setAdminKeyInput(saved)
    }
  }, [])

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    }),
    [adminKey],
  )

  const loadAll = async () => {
    if (!adminKey) return
    setLoading(true)
    setError(null)
    try {
      const leadsParams = new URLSearchParams({
        limit: '50',
        page: '1',
        status: statusFilter,
        search,
      })

      const [statsRes, leadsRes, videosRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats', { headers, cache: 'no-store' }),
        fetch(`/api/leads?${leadsParams.toString()}`, { headers, cache: 'no-store' }),
        fetch('/api/admin/videos', { headers, cache: 'no-store' }),
      ])

      const statsPayload = await statsRes.json().catch(() => ({}))
      const leadsPayload = await leadsRes.json().catch(() => ({}))
      const videosPayload = await videosRes.json().catch(() => ({}))

      if (!statsRes.ok) throw new Error(statsPayload?.error || 'Failed loading stats')
      if (!leadsRes.ok) throw new Error(leadsPayload?.error || 'Failed loading leads')
      if (!videosRes.ok) throw new Error(videosPayload?.error || 'Failed loading videos')

      setStats(statsPayload.stats || defaultStats)
      setLeads(leadsPayload.leads || [])
      setVideos(videosPayload.videos || [])
    } catch (err: any) {
      setError(err?.message || 'Failed loading admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!adminKey) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, statusFilter])

  const loginAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminKey(adminKeyInput.trim())
    localStorage.setItem('mpu_admin_key', adminKeyInput.trim())
  }

  const updateLead = async (leadId: string, patch: { status?: LeadStatus; notes?: string }) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update lead')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to update lead')
    }
  }

  const createVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers,
        body: JSON.stringify(newVideo),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to create video')
      setNewVideo({
        title: '',
        videoUrl: '',
        description: '',
        category: 'general',
        orderIndex: 0,
      })
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to create video')
    }
  }

  const togglePublish = async (video: VideoItem) => {
    try {
      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isPublished: !video.isPublished }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update video')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to update video')
    }
  }

  const deleteVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to delete video')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete video')
    }
  }

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter `ADMIN_DASHBOARD_KEY` to open CRM + video management.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={loginAdmin}>
              <Input
                type="password"
                placeholder="Admin key"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">Open Admin</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">CRM + Teaching Admin</h1>
            <p className="text-sm text-slate-600">Supabase-backed signups and video library management.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={activeTab === 'crm' ? 'default' : 'outline'} onClick={() => setActiveTab('crm')}>CRM</Button>
            <Button variant={activeTab === 'videos' ? 'default' : 'outline'} onClick={() => setActiveTab('videos')}>Videos</Button>
            <Button variant="outline" onClick={() => { localStorage.removeItem('mpu_admin_key'); setAdminKey('') }}>
              Lock
            </Button>
          </div>
        </div>

        {error && (
          <Card>
            <CardContent className="py-3 text-red-700 text-sm">{error}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Total Leads</p><p className="text-xl font-bold">{stats.totalLeads}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">New</p><p className="text-xl font-bold">{stats.newLeads}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Contacted</p><p className="text-xl font-bold">{stats.contactedLeads}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Enrolled</p><p className="text-xl font-bold">{stats.enrolledLeads}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Closed</p><p className="text-xl font-bold">{stats.closedLeads}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Videos</p><p className="text-xl font-bold">{stats.totalVideos}</p></CardContent></Card>
          <Card><CardContent className="py-4 text-center"><p className="text-xs text-slate-500">Published</p><p className="text-xl font-bold">{stats.publishedVideos}</p></CardContent></Card>
        </div>

        {activeTab === 'crm' && (
          <Card>
            <CardHeader>
              <CardTitle>Signup CRM</CardTitle>
              <CardDescription>Track and update lead statuses from the new signup funnel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <Input
                  placeholder="Search by name/email/phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="closed">Closed</option>
                </select>
                <Button variant="outline" onClick={loadAll} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
              </div>

              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead._id} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{lead.firstName} {lead.lastName}</p>
                        <p className="text-sm text-slate-600">{lead.email} • {lead.phone}</p>
                        <p className="text-xs text-slate-500">Created: {new Date(lead.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={lead.status}
                          onChange={(e) => updateLead(lead._id, { status: e.target.value as LeadStatus })}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    {lead.goals && <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.goals}</p>}
                    <Textarea
                      rows={2}
                      placeholder="Admin notes"
                      defaultValue={lead.notes || ''}
                      onBlur={(e) => {
                        const value = e.target.value
                        if (value !== (lead.notes || '')) updateLead(lead._id, { notes: value })
                      }}
                    />
                  </div>
                ))}
                {!leads.length && <p className="text-sm text-slate-600">No signups found.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'videos' && (
          <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Add Video</CardTitle>
                <CardDescription>Create a new lesson in the teaching environment.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={createVideo}>
                  <Input
                    placeholder="Title"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Video URL (mp4 or stream URL)"
                    value={newVideo.videoUrl}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, videoUrl: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Category"
                    value={newVideo.category}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, category: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Order index"
                    value={newVideo.orderIndex}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, orderIndex: Number(e.target.value || 0) }))}
                  />
                  <Textarea
                    placeholder="Description"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <Button type="submit" className="w-full">Create Video</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Video Library</CardTitle>
                <CardDescription>{videos.length} video(s) in Supabase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex flex-wrap gap-2 items-start justify-between">
                      <div>
                        <p className="font-semibold">{video.title}</p>
                        <p className="text-sm text-slate-600">{video.category} • order {video.orderIndex}</p>
                        {video.description && <p className="text-sm text-slate-700 mt-1">{video.description}</p>}
                        <a href={video.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                          Open source URL
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => togglePublish(video)}>
                          {video.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button variant="destructive" onClick={() => deleteVideo(video.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!videos.length && <p className="text-sm text-slate-600">No videos found.</p>}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
