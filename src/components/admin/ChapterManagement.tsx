'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BookOpen, Plus, Edit, Trash2, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
  isActive: boolean
  videoCount?: number
  moduleKey?: string
  createdAt: Date
}

interface VideoData {
  _id: string
  title: string
  description: string
  muxAssetId?: string
  muxPlaybackId?: string
  duration: number
  order: number
  isActive: boolean
  chapterId: string
  chapterTitle?: string
  status?: string
  createdAt: Date
}

const MODULE_OPTIONS = [
  { key: 'alcohol_drugs', label: 'Lernvideos Alkohol & Drogen' },
  { key: 'traffic_points', label: 'Lernvideos Verkehr­sauffälligkeiten (Punkte in Flensburg)' },
  { key: 'medicinal_cannabis', label: 'Lernvideos Medizinalcannabis' },
  { key: 'extras', label: 'Zusatzvideos' },
]

export default function ChapterManagement() {
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterData | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [videos, setVideos] = useState<VideoData[]>([])
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoData | null>(null)
  const [videoFormLoading, setVideoFormLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useI18n()

  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    moduleKey: MODULE_OPTIONS[0].key,
  })

  const [videoFormData, setVideoFormData] = useState({
    title: '',
    description: '',
    muxAssetId: '',
    order: 1,
    chapterId: '' as string,
  })

  const [activeVideoChapter, setActiveVideoChapter] = useState<ChapterData | null>(null)

  useEffect(() => {
    fetchChapters()
    fetchVideos()
  }, [])

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      if (response.ok) {
        setChapters(data.chapters)
      } else {
        toast({
          title: t('error'),
          description: data.error || t('unexpectedError'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/admin/videos')
      const data = await response.json()
      if (response.ok) {
        setVideos(data.videos)
      } else {
        console.error('Failed to fetch videos:', data.error)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const filteredChapters = selectedModuleKey
    ? chapters.filter((c) => c.moduleKey === selectedModuleKey)
    : chapters

  const getModuleLabel = (key: string) => MODULE_OPTIONS.find((m) => m.key === key)?.label || key

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    if (!formData.title.trim() || !formData.description.trim() || !formData.moduleKey) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
      setFormLoading(false)
      return
    }

    try {
      const url = editingChapter ? `/api/admin/chapters/${editingChapter._id}` : '/api/admin/chapters'
      const method = editingChapter ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: t('success'), description: `${t('chapterManagement')} ${editingChapter ? t('update') : t('create')} ${t('success').toLowerCase()}` })
        setDialogOpen(false)
        resetForm()
        fetchChapters()
      } else {
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    const nextOrder = selectedModuleKey ? (filteredChapters.length + 1) : (chapters.length + 1)
    setFormData({
      title: '',
      description: '',
      order: nextOrder,
      moduleKey: selectedModuleKey || MODULE_OPTIONS[0].key,
    })
    setEditingChapter(null)
  }

  const handleEdit = (chapter: ChapterData) => {
    setEditingChapter(chapter)
    setFormData({ title: chapter.title, description: chapter.description, order: chapter.order, moduleKey: chapter.moduleKey || MODULE_OPTIONS[0].key })
    setDialogOpen(true)
  }

  const handleDelete = async (chapterId: string) => {
    if (!confirm(t('confirmDeleteVideo'))) { // reuse generic
      return
    }

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}`, { method: 'DELETE' })

      if (response.ok) {
        toast({ title: t('success'), description: t('chapterDeleted') })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  const moveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      })

      if (response.ok) {
        toast({ title: t('success'), description: t('orderUpdated') })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  // Video actions
  const openAddVideo = (chapter: ChapterData) => {
    setActiveVideoChapter(chapter)
    const chapterVideos = videos.filter(v => v.chapterId === chapter._id)
    setVideoFormData({ title: '', description: '', muxAssetId: '', order: (chapterVideos.length + 1), chapterId: chapter._id })
    setEditingVideo(null)
    setVideoDialogOpen(true)
  }

  const handleEditVideo = (video: VideoData) => {
    setEditingVideo(video)
    setActiveVideoChapter(chapters.find(c => c._id === video.chapterId) || null)
    setVideoFormData({ title: video.title, description: video.description, muxAssetId: video.muxAssetId || '', order: video.order, chapterId: video.chapterId })
    setVideoDialogOpen(true)
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm(t('confirmDeleteVideo'))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: t('success'), description: t('videoDeleted') })
        fetchVideos()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  const syncMuxAsset = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/sync-mux`, { method: 'POST' })
      if (response.ok) {
        toast({ title: t('success'), description: t('muxSynced') })
        fetchVideos()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('failedToSyncMux'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setVideoFormLoading(true)

    if (!videoFormData.description.trim() || !videoFormData.chapterId) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
      setVideoFormLoading(false)
      return
    }

    try {
      const url = editingVideo ? `/api/admin/videos/${editingVideo._id}` : '/api/admin/videos'
      const method = editingVideo ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoFormData),
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: t('success'), description: `Video ${editingVideo ? t('update') : t('create')} ${t('success').toLowerCase()}` })
        setVideoDialogOpen(false)
        setEditingVideo(null)
        fetchVideos()
      } else {
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    } finally {
      setVideoFormLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('chapterManagement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {selectedModuleKey ? getModuleLabel(selectedModuleKey) : t('chapterManagement')}
          </div>
          <div className="flex items-center gap-2">
            {selectedModuleKey ? (
              <>
                <Button variant="outline" onClick={() => setSelectedModuleKey(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addChapter')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingChapter ? t('editChapter') : t('addNewChapter')}
                      </DialogTitle>
                      <DialogDescription>
                        {t('chaptersWillBePresented')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">{t('chapterTitle')}</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder={t('chapterTitle')} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{t('chapterDescription')}</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder={t('chapterDescription')} rows={3} required />
                      </div>

                      {/* Show category as read-only in category view */}
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <div className="w-full border rounded px-3 py-2 bg-muted text-sm">
                          {getModuleLabel(formData.moduleKey)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="order">{t('chapterOrder')}</Label>
                        <Input id="order" type="number" value={formData.order} onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))} min="1" />
                        <p className="text-xs text-gray-500">{t('chaptersWillBePresented')}</p>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={formLoading}>
                          {formLoading ? t('processing') : (editingChapter ? t('updateChapter') : t('createChapter'))}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        </CardTitle>
        <CardDescription>
          {selectedModuleKey ? t('chaptersWillBePresented') : 'Select a category to manage its modules'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedModuleKey ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULE_OPTIONS.map((m) => {
              const count = chapters.filter((c) => c.moduleKey === m.key).length
              return (
                <div key={m.key} className="border rounded-lg p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      <h3 className="font-medium">{m.label}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Modules: {count}</p>
                  </div>
                  <div className="pt-3">
                    <Button className="w-full" onClick={() => {
                      setSelectedModuleKey(m.key)
                      setFormData(prev => ({ ...prev, moduleKey: m.key }))
                    }}>
                      Manage
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noChaptersFound')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChapters.map((chapter, index) => {
                  const videosForChapter = videos
                    .filter((v: any) => (typeof v.chapterId === 'string' ? v.chapterId === chapter._id : v.chapterId?._id === chapter._id))
                    .sort((a, b) => a.order - b.order)
                  return (
                  <div key={chapter._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {t('chapter')} {chapter.order}
                          </span>
                          <h3 className="font-medium">{chapter.title}</h3>
                          {chapter.moduleKey && (
                            <span className="ml-2 text-xs text-gray-500">[{chapter.moduleKey}]</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{chapter.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{t('videosCount', { count: videosForChapter.length })}</span>
                          <span>{t('createdLabel')}: {new Date(chapter.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Videos for this module */}
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">{t('videos')}</h4>
                            <Button size="sm" onClick={() => openAddVideo(chapter)}>
                              {t('addVideo')}
                            </Button>
                          </div>
                          {videosForChapter.length === 0 ? (
                            <p className="text-xs text-gray-500">{t('noVideosFound')}</p>
                          ) : (
                            <div className="space-y-2">
                              {videosForChapter.map((video) => (
                                <div key={video._id} className="border rounded p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-medium">{video.title}</h5>
                                        {video.status === 'ready' ? (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{t('ready')}</span>
                                        ) : video.status === 'preparing' ? (
                                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">{t('processing')}</span>
                                        ) : (
                                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{t('unknown')}</span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{video.description}</p>
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>{t('orderLabel')} {video.order}</span>
                                        {video.duration > 0 && <span>{t('duration')} {Math.round(video.duration)}s</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {video.muxPlaybackId && (
                                        <Button size="sm" variant="outline" asChild>
                                          <a href={`https://stream.mux.com/${video.muxPlaybackId}`} target="_blank" rel="noopener noreferrer">View</a>
                                        </Button>
                                      )}
                                      {video.muxAssetId && (
                                        <Button size="sm" variant="outline" onClick={() => syncMuxAsset(video._id)}>Sync</Button>
                                      )}
                                      <Button size="sm" variant="outline" onClick={() => handleEditVideo(video)}>{t('editVideo')}</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleDeleteVideo(video._id)}>{t('deleteBtn')}</Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => moveChapter(chapter._id, 'up')} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => moveChapter(chapter._id, 'down')} disabled={index === filteredChapters.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(chapter)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(chapter._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    
    {/* Add/Edit Video Dialog */}
    <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {editingVideo ? t('editVideo') : t('addNewVideo')}
          </DialogTitle>
          <DialogDescription>
            {activeVideoChapter ? `${t('chapter')} ${activeVideoChapter.order}: ${activeVideoChapter.title}` : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => handleSubmitVideo(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-title">{t('videoTitle')}</Label>
            <Input id="video-title" value={videoFormData.title} onChange={(e) => setVideoFormData(prev => ({ ...prev, title: e.target.value }))} placeholder={t('enterVideoTitle')} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-description">{t('description')}</Label>
            <Textarea id="video-description" value={videoFormData.description} onChange={(e) => setVideoFormData(prev => ({ ...prev, description: e.target.value }))} placeholder={t('enterDescription')} rows={3} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-mux">{t('muxAssetId')}</Label>
            <Input id="video-mux" value={videoFormData.muxAssetId} onChange={(e) => setVideoFormData(prev => ({ ...prev, muxAssetId: e.target.value }))} placeholder={t('enterMuxAssetId')} />
            <p className="text-xs text-gray-500">{t('findMuxHint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video-order">{t('order')}</Label>
              <Input id="video-order" type="number" value={videoFormData.order} onChange={(e) => setVideoFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))} min="1" />
            </div>
            <div className="space-y-2">
              <Label>{t('chapter')}</Label>
              <div className="w-full border rounded px-3 py-2 bg-muted text-sm">
                {activeVideoChapter ? `${t('chapter')} ${activeVideoChapter.order}: ${activeVideoChapter.title}` : ''}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVideoDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={videoFormLoading}>
              {videoFormLoading ? t('processing') : (editingVideo ? t('updateVideo') : t('createVideo'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}