'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock,
  Edit3,
  EyeOff,
  FolderPlus,
  GripVertical,
  Layers3,
  Loader2,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import VideoPlayer from '@/components/video/VideoPlayer'

type VideoItem = {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl?: string | null
  durationSeconds?: number | null
  category: string
  categoryId?: string | null
  categoryTitle?: string | null
  categorySlug?: string | null
  categoryOrderIndex?: number | null
  chapterId?: string | null
  chapterTitle?: string | null
  chapterSlug?: string | null
  chapterOrderIndex?: number | null
  orderIndex: number
  isPublished: boolean
  provider?: string | null
  youtubeVideoId?: string | null
  youtubeUrl?: string
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxStatus?: string | null
  createdAt?: string | null
}

type ChapterItem = {
  id: string
  categoryId: string
  title: string
  slug: string
  description: string | null
  orderIndex: number
  isActive: boolean
}

type CategoryItem = {
  id: string
  name: string
  slug: string
  description: string | null
  orderIndex: number
  isActive: boolean
  chapters: ChapterItem[]
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Dauer offen'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatMuxStatus(status?: string | null, hasPlaybackId?: string | null) {
  const normalizedStatus = status || (hasPlaybackId ? 'ready' : 'processing')
  switch (normalizedStatus) {
    case 'ready':
      return 'Bereit'
    case 'processing':
      return 'Wird verarbeitet'
    case 'errored':
      return 'Fehler'
    default:
      return normalizedStatus
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload?.error || 'Aktion fehlgeschlagen.')
  return payload as T
}

function uploadFileToMux(uploadUrl: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Upload fehlgeschlagen (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'))
    xhr.send(file)
  })
}

export default function VideosPage() {
  const { toast } = useToast()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)

  const [categoryDialog, setCategoryDialog] = useState<{ id?: string; name: string; description: string } | null>(null)
  const [chapterDialog, setChapterDialog] = useState<{ id?: string; categoryId: string; title: string; description: string } | null>(null)
  const [editVideo, setEditVideo] = useState<VideoItem | null>(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [addMode, setAddMode] = useState<'youtube' | 'upload'>('youtube')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsPublished, setFormIsPublished] = useState(false)
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || categories[0] || null,
    [categories, selectedCategoryId],
  )
  const selectedChapters = useMemo(() => selectedCategory?.chapters || [], [selectedCategory])
  const selectedChapter = useMemo(
    () => selectedChapters.find((chapter) => chapter.id === selectedChapterId) || selectedChapters[0] || null,
    [selectedChapters, selectedChapterId],
  )
  const selectedCategoryIndex = selectedCategory ? categories.findIndex((category) => category.id === selectedCategory.id) : -1
  const selectedChapterIndex = selectedChapter ? selectedChapters.findIndex((chapter) => chapter.id === selectedChapter.id) : -1

  const videosByChapter = useMemo(() => {
    return videos.reduce<Record<string, VideoItem[]>>((acc, video) => {
      const key = video.chapterId || 'unassigned'
      if (!acc[key]) acc[key] = []
      acc[key].push(video)
      return acc
    }, {})
  }, [videos])

  const chapterVideos = useMemo(() => {
    if (!selectedChapter) return []
    return [...(videosByChapter[selectedChapter.id] || [])].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [selectedChapter, videosByChapter])

  const unassignedVideos = videosByChapter.unassigned || []
  const publishedCount = videos.filter((video) => video.isPublished).length
  const totalMinutes = Math.round(videos.reduce((sum, video) => sum + (video.durationSeconds || 0), 0) / 60)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [videoPayload, categoryPayload] = await Promise.all([
        requestJson<{ videos: VideoItem[] }>('/api/admin/videos', { cache: 'no-store' }),
        requestJson<{ categories: CategoryItem[] }>('/api/admin/video-categories', { cache: 'no-store' }),
      ])
      setVideos(videoPayload.videos || [])
      setCategories(categoryPayload.categories || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId(null)
      setSelectedChapterId(null)
      return
    }

    const category = categories.find((item) => item.id === selectedCategoryId) || categories[0]
    if (category.id !== selectedCategoryId) setSelectedCategoryId(category.id)

    const chapter = category.chapters.find((item) => item.id === selectedChapterId) || category.chapters[0] || null
    if ((chapter?.id || null) !== selectedChapterId) setSelectedChapterId(chapter?.id || null)
  }, [categories, selectedCategoryId, selectedChapterId])

  const resetUpload = () => {
    setAddMode('youtube')
    setFormTitle('')
    setFormDescription('')
    setFormIsPublished(false)
    setFormYoutubeUrl('')
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadStatus('')
    setUploadError(null)
  }

  const openUpload = () => {
    resetUpload()
    setUploadOpen(true)
  }

  const finalizeUploadWithRetry = async (uploadId: string) => {
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const payload = await requestJson<{ ready?: boolean }>('/api/admin/videos/finalize-upload', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: selectedChapter?.slug || selectedCategory?.slug || 'general',
          chapterId: selectedChapter?.id || null,
          orderIndex: chapterVideos.length + 1,
          isPublished: formIsPublished,
        }),
      }).catch(async (error) => {
        if (error instanceof Error && error.message.includes('processing')) return { ready: false }
        throw error
      })

      if (payload?.ready === false) {
        setUploadStatus(`Mux verarbeitet das Video... (${attempt}/30)`)
        await sleep(2500)
        continue
      }
      return payload
    }
    throw new Error('Video wird noch verarbeitet. Bitte in 1-2 Minuten erneut laden.')
  }

  const handleAddYouTube = async () => {
    if (!formYoutubeUrl.trim() || !formTitle.trim() || !selectedChapter || uploading) return
    setUploading(true)
    setUploadError(null)
    try {
      setUploadStatus('Video wird gespeichert...')
      await requestJson('/api/admin/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          youtubeUrl: formYoutubeUrl.trim(),
          category: selectedChapter.slug,
          chapterId: selectedChapter.id,
          orderIndex: chapterVideos.length + 1,
          isPublished: formIsPublished,
        }),
      })
      await loadData()
      setUploadOpen(false)
      resetUpload()
      toast({ title: 'Video gespeichert', description: 'Das YouTube-Video wurde im ausgewählten Kapitel abgelegt.' })
    } catch (error: any) {
      const message = error?.message || 'Video konnte nicht gespeichert werden.'
      setUploadError(message)
      toast({ title: 'Fehler', description: message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !formTitle.trim() || !selectedChapter || uploading) return
    setUploading(true)
    setUploadError(null)
    try {
      setUploadStatus('Upload-URL wird erstellt...')
      const uploadPayload = await requestJson<{ uploadId: string; uploadUrl: string }>('/api/admin/videos/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle.trim(),
          category: selectedChapter.slug,
          chapterId: selectedChapter.id,
        }),
      })

      setUploadStatus('Datei wird zu Mux hochgeladen...')
      await uploadFileToMux(uploadPayload.uploadUrl, selectedFile, setUploadProgress)

      setUploadStatus('Video wird gespeichert...')
      await finalizeUploadWithRetry(uploadPayload.uploadId)
      await loadData()
      setUploadOpen(false)
      resetUpload()
      toast({ title: 'Video gespeichert', description: 'Das Video wurde im ausgewählten Kapitel abgelegt.' })
    } catch (error: any) {
      const message = error?.message || 'Upload fehlgeschlagen.'
      setUploadError(message)
      toast({ title: 'Upload fehlgeschlagen', description: message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const saveCategory = async () => {
    if (!categoryDialog?.name.trim()) return
    const isEdit = !!categoryDialog.id
    setBusyKey('category-save')
    try {
      await requestJson(isEdit ? `/api/admin/video-categories/${categoryDialog.id}` : '/api/admin/video-categories', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: categoryDialog.name.trim(),
          description: categoryDialog.description.trim(),
        }),
      })
      setCategoryDialog(null)
      await loadData()
    } catch (error) {
      toast({ title: 'Fehler', description: error instanceof Error ? error.message : 'Kategorie konnte nicht gespeichert werden.', variant: 'destructive' })
    } finally {
      setBusyKey(null)
    }
  }

  const saveChapter = async () => {
    if (!chapterDialog?.title.trim()) return
    const isEdit = !!chapterDialog.id
    setBusyKey('chapter-save')
    try {
      await requestJson(isEdit ? `/api/admin/video-chapters/${chapterDialog.id}` : '/api/admin/video-chapters', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          categoryId: chapterDialog.categoryId,
          title: chapterDialog.title.trim(),
          description: chapterDialog.description.trim(),
        }),
      })
      setChapterDialog(null)
      await loadData()
    } catch (error) {
      toast({ title: 'Fehler', description: error instanceof Error ? error.message : 'Kapitel konnte nicht gespeichert werden.', variant: 'destructive' })
    } finally {
      setBusyKey(null)
    }
  }

  const saveVideo = async () => {
    if (!editVideo?.title.trim()) return
    setBusyKey(`video-${editVideo.id}`)
    try {
      await requestJson(`/api/admin/videos/${editVideo.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editVideo.title.trim(),
          description: editVideo.description || '',
          chapterId: editVideo.chapterId || null,
          orderIndex: editVideo.orderIndex,
          isPublished: editVideo.isPublished,
          ...(editVideo.youtubeUrl?.trim() ? { youtubeUrl: editVideo.youtubeUrl.trim() } : {}),
        }),
      })
      setEditVideo(null)
      await loadData()
    } catch (error) {
      toast({ title: 'Fehler', description: error instanceof Error ? error.message : 'Video konnte nicht gespeichert werden.', variant: 'destructive' })
    } finally {
      setBusyKey(null)
    }
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key)
    try {
      await action()
      await loadData()
    } catch (error) {
      toast({ title: 'Fehler', description: error instanceof Error ? error.message : 'Aktion fehlgeschlagen.', variant: 'destructive' })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <Clapperboard className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-950')}>Video Akademie</h1>
            <p className="text-sm font-semibold text-slate-500">Kategorien, Kapitel und Videos in der richtigen Reihenfolge verwalten.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            Aktualisieren
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setCategoryDialog({ name: '', description: '' })}>
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            Kategorie
          </Button>
          <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={openUpload} disabled={!selectedChapter}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Video hinzufügen
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Kategorien', categories.length],
          ['Kapitel', categories.reduce((sum, category) => sum + category.chapters.length, 0)],
          ['Videos', `${publishedCount}/${videos.length} sichtbar · ${totalMinutes} Min.`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className={cn(displayFont.className, 'mt-1 text-xl font-bold text-slate-950')}>{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[300px_340px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Kategorien</h2>
              <p className="text-xs font-semibold text-slate-500">Oberste Kursstruktur</p>
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setCategoryDialog({ name: '', description: '' })} title="Kategorie erstellen">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="p-2">
            {categories.map((category, index) => {
              const isActive = selectedCategory?.id === category.id
              const count = category.chapters.reduce((sum, chapter) => sum + (videosByChapter[chapter.id]?.length || 0), 0)
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id)
                    setSelectedChapterId(category.chapters[0]?.id || null)
                  }}
                  className={cn(
                    'mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                    isActive ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950">{category.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{category.chapters.length} Kapitel · {count} Videos</p>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-slate-400', isActive && 'text-blue-600')} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-950">{selectedCategory?.name || 'Kapitel'}</h2>
              <p className="text-xs font-semibold text-slate-500">Kapitel innerhalb der Kategorie</p>
            </div>
            <div className="flex items-center gap-1">
              {selectedCategory && (
                <>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => runAction(`category-up-${selectedCategory.id}`, () => requestJson(`/api/admin/video-categories/${selectedCategory.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'up' }) }).then(() => undefined))} disabled={selectedCategoryIndex <= 0 || busyKey !== null} title="Kategorie nach oben">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => runAction(`category-down-${selectedCategory.id}`, () => requestJson(`/api/admin/video-categories/${selectedCategory.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'down' }) }).then(() => undefined))} disabled={selectedCategoryIndex < 0 || selectedCategoryIndex >= categories.length - 1 || busyKey !== null} title="Kategorie nach unten">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setCategoryDialog({ id: selectedCategory.id, name: selectedCategory.name, description: selectedCategory.description || '' })} title="Kategorie bearbeiten">
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => {
                    if (!window.confirm('Diese Kategorie und ihre Kapitel wirklich löschen? Videos verlieren dadurch ihre Kapitel-Zuordnung.')) return
                    runAction(`category-delete-${selectedCategory.id}`, () => requestJson(`/api/admin/video-categories/${selectedCategory.id}`, { method: 'DELETE' }).then(() => undefined))
                  }} title="Kategorie löschen">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setChapterDialog({ categoryId: selectedCategory.id, title: '', description: '' })} title="Kapitel erstellen">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="p-2">
            {selectedChapters.map((chapter, index) => {
              const isActive = selectedChapter?.id === chapter.id
              const count = videosByChapter[chapter.id]?.length || 0
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => setSelectedChapterId(chapter.id)}
                  className={cn(
                    'mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                    isActive ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <Layers3 className={cn('h-5 w-5 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950">{chapter.title}</p>
                    <p className="text-xs font-semibold text-slate-500">Kapitel {index + 1} · {count} Videos</p>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-slate-400', isActive && 'text-blue-600')} aria-hidden="true" />
                </button>
              )
            })}

            {selectedCategory && selectedChapters.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">
                <p className="text-sm font-bold text-slate-700">Noch keine Kapitel</p>
                <Button className="mt-3 gap-2" size="sm" onClick={() => setChapterDialog({ categoryId: selectedCategory.id, title: '', description: '' })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Kapitel erstellen
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-950">{selectedChapter?.title || 'Videos'}</h2>
              <p className="text-xs font-semibold text-slate-500">{chapterVideos.length} Videos in diesem Kapitel</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedChapter && (
                <>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => runAction(`chapter-up-${selectedChapter.id}`, () => requestJson(`/api/admin/video-chapters/${selectedChapter.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'up' }) }).then(() => undefined))} disabled={selectedChapterIndex <= 0 || busyKey !== null}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    Hoch
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => runAction(`chapter-down-${selectedChapter.id}`, () => requestJson(`/api/admin/video-chapters/${selectedChapter.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'down' }) }).then(() => undefined))} disabled={selectedChapterIndex < 0 || selectedChapterIndex >= selectedChapters.length - 1 || busyKey !== null}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    Runter
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setChapterDialog({ id: selectedChapter.id, categoryId: selectedChapter.categoryId, title: selectedChapter.title, description: selectedChapter.description || '' })}>
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Kapitel
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => {
                    if (!window.confirm('Dieses Kapitel wirklich löschen? Videos verlieren dadurch ihre Kapitel-Zuordnung.')) return
                    runAction(`chapter-delete-${selectedChapter.id}`, () => requestJson(`/api/admin/video-chapters/${selectedChapter.id}`, { method: 'DELETE' }).then(() => undefined))
                  }}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Löschen
                  </Button>
                  <Button size="sm" className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={openUpload}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Video
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {chapterVideos.map((video, index) => (
              <div key={video.id} className="grid gap-4 p-4 md:grid-cols-[128px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
                  {video.thumbnailUrl ? (
                    <Image src={video.thumbnailUrl} alt={video.title} fill sizes="128px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PlayCircle className="h-8 w-8 text-slate-400" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-black text-slate-600">
                      {index + 1}
                    </span>
                    <Badge variant={video.isPublished ? 'default' : 'secondary'} className={cn(video.isPublished && 'bg-emerald-600 text-white')}>
                      {video.isPublished ? 'Sichtbar' : 'Entwurf'}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </div>
                  <h3 className={cn(displayFont.className, 'mt-2 line-clamp-1 text-lg font-bold text-slate-950')}>{video.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600">{video.description || 'Keine Beschreibung vorhanden.'}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {video.youtubeVideoId ? 'Quelle: YouTube' : `Mux: ${formatMuxStatus(video.muxStatus, video.muxPlaybackId)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 md:justify-end">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => runAction(`video-up-${video.id}`, () => requestJson(`/api/admin/videos/${video.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'up' }) }).then(() => undefined))} disabled={index === 0 || busyKey !== null} title="Nach oben">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => runAction(`video-down-${video.id}`, () => requestJson(`/api/admin/videos/${video.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'down' }) }).then(() => undefined))} disabled={index === chapterVideos.length - 1 || busyKey !== null} title="Nach unten">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setPreviewVideo(video)} disabled={!video.muxPlaybackId && !video.youtubeVideoId} title="Vorschau">
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditVideo({ ...video, youtubeUrl: video.youtubeVideoId ? `https://www.youtube.com/watch?v=${video.youtubeVideoId}` : '' })} title="Bearbeiten">
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => runAction(`publish-${video.id}`, () => requestJson(`/api/admin/videos/${video.id}`, { method: 'PUT', body: JSON.stringify({ isPublished: !video.isPublished }) }).then(() => undefined))} title={video.isPublished ? 'Ausblenden' : 'Sichtbar machen'}>
                    {video.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => {
                    if (!window.confirm('Dieses Video wirklich löschen?')) return
                    runAction(`delete-${video.id}`, () => requestJson(`/api/admin/videos/${video.id}`, { method: 'DELETE' }).then(() => undefined))
                  }} title="Löschen">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!loading && selectedChapter && chapterVideos.length === 0 && (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <GripVertical className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Dieses Kapitel ist leer</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Fügen Sie ein YouTube-Video hinzu oder verschieben Sie bestehende Videos in dieses Kapitel.</p>
              <Button className="mt-5 gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={openUpload}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Video hinzufügen
              </Button>
            </div>
          )}

          {unassignedVideos.length > 0 && (
            <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {unassignedVideos.length} Video(s) sind keinem Kapitel zugeordnet. Öffnen Sie ein Video über Bearbeiten und wählen Sie ein Kapitel.
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!categoryDialog} onOpenChange={(open) => !open && setCategoryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{categoryDialog?.id ? 'Kategorie bearbeiten' : 'Kategorie erstellen'}</DialogTitle>
            <DialogDescription>Kategorien sind die oberste Struktur der Akademie.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={categoryDialog?.name || ''} onChange={(e) => setCategoryDialog((current) => current ? { ...current, name: e.target.value } : current)} placeholder="z. B. MPU Grundlagen" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={categoryDialog?.description || ''} onChange={(e) => setCategoryDialog((current) => current ? { ...current, description: e.target.value } : current)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(null)}>Abbrechen</Button>
            <Button onClick={saveCategory} disabled={busyKey === 'category-save'}>{busyKey === 'category-save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chapterDialog} onOpenChange={(open) => !open && setChapterDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chapterDialog?.id ? 'Kapitel bearbeiten' : 'Kapitel erstellen'}</DialogTitle>
            <DialogDescription>Kapitel enthalten die Videos und definieren die Lernreihenfolge.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={chapterDialog?.categoryId || ''} onValueChange={(value) => setChapterDialog((current) => current ? { ...current, categoryId: value } : current)}>
                <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={chapterDialog?.title || ''} onChange={(e) => setChapterDialog((current) => current ? { ...current, title: e.target.value } : current)} placeholder="z. B. Einstieg" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={chapterDialog?.description || ''} onChange={(e) => setChapterDialog((current) => current ? { ...current, description: e.target.value } : current)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterDialog(null)}>Abbrechen</Button>
            <Button onClick={saveChapter} disabled={busyKey === 'chapter-save'}>{busyKey === 'chapter-save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) setUploadOpen(open) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Video hinzufügen</DialogTitle>
            <DialogDescription>{selectedCategory?.name} / {selectedChapter?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAddMode('youtube')}
                disabled={uploading}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-bold transition-colors',
                  addMode === 'youtube' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                YouTube-Link
              </button>
              <button
                type="button"
                onClick={() => setAddMode('upload')}
                disabled={uploading}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-bold transition-colors',
                  addMode === 'upload' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                Datei-Upload (Mux)
              </button>
            </div>
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} disabled={uploading} />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} disabled={uploading} />
            </div>
            {addMode === 'youtube' ? (
              <div className="space-y-2">
                <Label>YouTube-Link</Label>
                <Input
                  value={formYoutubeUrl}
                  onChange={(e) => setFormYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={uploading}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Tipp: Laden Sie das Video bei YouTube als &bdquo;Nicht gelistet&ldquo; hoch, damit es nicht öffentlich gefunden wird.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Videodatei</Label>
                <Input type="file" accept="video/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} disabled={uploading} />
              </div>
            )}
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={formIsPublished} onChange={(e) => setFormIsPublished(e.target.checked)} disabled={uploading} className="h-4 w-4 rounded border-slate-300" />
              Sofort sichtbar machen
            </label>
            {uploading && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {uploadStatus || 'Upload läuft...'}
                </div>
                <div className="h-2 rounded-full bg-blue-100">
                  <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(5, uploadProgress)}%` }} />
                </div>
                <p className="mt-1 text-xs font-bold text-blue-700">{uploadProgress}%</p>
              </div>
            )}
            {uploadError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{uploadError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Abbrechen</Button>
            {addMode === 'youtube' ? (
              <Button onClick={handleAddYouTube} disabled={!formTitle.trim() || !formYoutubeUrl.trim() || !selectedChapter || uploading} className="bg-blue-600 text-white hover:bg-blue-700">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Hinzufügen
              </Button>
            ) : (
              <Button onClick={handleUpload} disabled={!formTitle.trim() || !selectedFile || !selectedChapter || uploading} className="bg-blue-600 text-white hover:bg-blue-700">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Hochladen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVideo} onOpenChange={(open) => !open && setEditVideo(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Video bearbeiten</DialogTitle>
            <DialogDescription>Titel, Kapitel, Reihenfolge und Sichtbarkeit anpassen.</DialogDescription>
          </DialogHeader>
          {editVideo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={editVideo.title} onChange={(e) => setEditVideo({ ...editVideo, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={editVideo.description || ''} onChange={(e) => setEditVideo({ ...editVideo, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>YouTube-Link</Label>
                <Input
                  value={editVideo.youtubeUrl || ''}
                  onChange={(e) => setEditVideo({ ...editVideo, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs font-semibold text-slate-500">
                  {editVideo.youtubeVideoId
                    ? 'Link ändern, um ein anderes YouTube-Video zu verwenden.'
                    : 'Optional: Link einfügen, um dieses Video auf YouTube umzustellen.'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div className="space-y-2">
                  <Label>Kapitel</Label>
                  <Select value={editVideo.chapterId || ''} onValueChange={(value) => setEditVideo({ ...editVideo, chapterId: value })}>
                    <SelectTrigger><SelectValue placeholder="Kapitel wählen" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => category.chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>{category.name} / {chapter.title}</SelectItem>
                      )))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input type="number" min={1} value={editVideo.orderIndex} onChange={(e) => setEditVideo({ ...editVideo, orderIndex: Math.max(1, Number(e.target.value || 1)) })} />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={editVideo.isPublished} onChange={(e) => setEditVideo({ ...editVideo, isPublished: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                Video ist sichtbar
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVideo(null)}>Abbrechen</Button>
            <Button onClick={saveVideo} disabled={!editVideo?.title.trim() || busyKey === `video-${editVideo?.id}`}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title || 'Vorschau'}</DialogTitle>
            <DialogDescription>Admin-Vorschau für das ausgewählte Video.</DialogDescription>
          </DialogHeader>
          {previewVideo && (
            <div className="overflow-hidden rounded-xl bg-slate-950">
              <VideoPlayer
                key={previewVideo.id}
                video={{
                  id: previewVideo.id,
                  title: previewVideo.title,
                  provider: previewVideo.provider,
                  youtubeVideoId: previewVideo.youtubeVideoId,
                  muxPlaybackId: previewVideo.muxPlaybackId,
                  durationSeconds: previewVideo.durationSeconds,
                }}
                persistProgress={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
