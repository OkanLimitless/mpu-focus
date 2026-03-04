'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  Clapperboard,
  RefreshCw,
  Plus,
  PlayCircle,
  Clock,
  CheckCircle2,
  Trash2,
  EyeOff,
  UploadCloud,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxStatus?: string | null
  createdAt?: string | null
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'n/a'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uploadFileToMux(uploadUrl: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formOrderIndex, setFormOrderIndex] = useState(1)
  const [formIsPublished, setFormIsPublished] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const canSubmitUpload = useMemo(() => {
    return !!(formTitle.trim() && selectedFile && !uploading)
  }, [formTitle, selectedFile, uploading])

  const loadVideos = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/videos', { cache: 'no-store' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Videos konnten nicht geladen werden.')
      }
      setVideos((payload.videos || []) as VideoItem[])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const resetDialog = () => {
    setFormTitle('')
    setFormDescription('')
    setFormCategory('general')
    setFormOrderIndex(Math.max(1, videos.length + 1))
    setFormIsPublished(true)
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadStatus('')
    setUploadError(null)
  }

  const openDialog = () => {
    resetDialog()
    setDialogOpen(true)
  }

  const finalizeUploadWithRetry = async (uploadId: string) => {
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const res = await fetch('/api/admin/videos/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory.trim() || 'general',
          orderIndex: formOrderIndex,
          isPublished: formIsPublished,
        }),
      })

      if (res.status === 202) {
        setUploadStatus(`Video wird von Mux verarbeitet... (${attempt}/30)`)
        await sleep(2500)
        continue
      }

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Finalisierung fehlgeschlagen.')
      }
      return payload
    }

    throw new Error('Video wird noch verarbeitet. Bitte in 1-2 Minuten erneut laden.')
  }

  const handleUpload = async () => {
    if (!canSubmitUpload || !selectedFile) return
    setUploading(true)
    setUploadError(null)

    try {
      setUploadStatus('Upload-URL wird erstellt...')
      const uploadUrlRes = await fetch('/api/admin/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory.trim() || 'general',
        }),
      })

      const uploadUrlPayload = await uploadUrlRes.json().catch(() => ({}))
      if (!uploadUrlRes.ok) {
        throw new Error(uploadUrlPayload?.error || 'Upload-URL konnte nicht erstellt werden.')
      }

      const uploadId = uploadUrlPayload.uploadId as string
      const uploadUrl = uploadUrlPayload.uploadUrl as string
      if (!uploadId || !uploadUrl) {
        throw new Error('Ungültige Upload-Informationen von Server erhalten.')
      }

      setUploadStatus('Datei wird zu Mux hochgeladen...')
      await uploadFileToMux(uploadUrl, selectedFile, setUploadProgress)

      setUploadStatus('Mux verarbeitet die Datei...')
      await finalizeUploadWithRetry(uploadId)

      setUploadStatus('Fertig. Video wurde gespeichert.')
      await loadVideos()
      setDialogOpen(false)
      resetDialog()
    } catch (error: any) {
      console.error(error)
      setUploadError(error?.message || 'Upload fehlgeschlagen.')
    } finally {
      setUploading(false)
    }
  }

  const togglePublish = async (video: VideoItem) => {
    setBusyVideoId(video.id)
    try {
      const res = await fetch(`/api/admin/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !video.isPublished }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Status konnte nicht geändert werden.')
      }
      await loadVideos()
    } catch (error) {
      console.error(error)
    } finally {
      setBusyVideoId(null)
    }
  }

  const deleteVideo = async (videoId: string) => {
    if (!window.confirm('Möchten Sie dieses Video wirklich löschen?')) return
    setBusyVideoId(videoId)
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Löschen fehlgeschlagen.')
      }
      await loadVideos()
    } catch (error) {
      console.error(error)
    } finally {
      setBusyVideoId(null)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <header className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
            <Clapperboard className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className={cn(displayFont.className, 'text-3xl font-bold text-slate-900 tracking-tight')}>Video Akademie</h1>
            <p className="font-medium text-slate-500">Kurse und Lehrmaterialien verwalten</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadVideos}
            disabled={loading}
            variant="outline"
            className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-2 shadow-sm rounded-xl"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-500', loading && 'animate-spin')} />
          </Button>
          <Button
            className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-sm rounded-xl"
            onClick={openDialog}
          >
            <Plus className="h-5 w-5" />
            Neues Video
          </Button>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!uploading) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Video zu Mux hochladen</DialogTitle>
            <DialogDescription>
              Datei wird direkt zu Mux hochgeladen. Nach der Verarbeitung wird der Kurs automatisch gespeichert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Titel</Label>
              <Input
                id="video-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z. B. MPU Gesprächsvorbereitung"
                disabled={uploading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-description">Beschreibung</Label>
              <Textarea
                id="video-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Inhalts"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="video-category">Kategorie</Label>
                <Input
                  id="video-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="general"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-order">Reihenfolge</Label>
                <Input
                  id="video-order"
                  type="number"
                  min={1}
                  value={formOrderIndex}
                  onChange={(e) => setFormOrderIndex(Math.max(1, Number(e.target.value || 1)))}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-file">Videodatei</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
                required
              />
              <p className="text-xs text-slate-500">
                Empfohlen: MP4 (H.264). Große Dateien werden direkt zu Mux hochgeladen.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formIsPublished}
                onChange={(e) => setFormIsPublished(e.target.checked)}
                disabled={uploading}
                className="h-4 w-4 rounded border-slate-300"
              />
              Nach Verarbeitung direkt veröffentlichen
            </label>

            {uploading && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-indigo-700 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadStatus || 'Wird verarbeitet...'}
                </div>
                <div className="h-2 w-full rounded bg-indigo-100">
                  <div
                    className="h-2 rounded bg-indigo-600 transition-all"
                    style={{ width: `${Math.max(5, uploadProgress)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-indigo-700">{uploadProgress}%</p>
              </div>
            )}

            {uploadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
                {uploadError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!canSubmitUpload}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload läuft...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Zu Mux hochladen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col">
            <div className="relative aspect-video bg-slate-900 w-full overflow-hidden flex items-center justify-center">
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" />
              ) : (
                <PlayCircle className="h-12 w-12 text-slate-700" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />

              <div className="absolute bottom-4 left-4 flex gap-2">
                <Badge className="bg-indigo-600/90 text-white font-bold border-indigo-500 shadow-md backdrop-blur-md">
                  {video.category || 'general'}
                </Badge>
                <Badge className="bg-slate-900/80 text-white font-semibold flex items-center gap-1.5 border-slate-700 backdrop-blur-md">
                  <Clock className="h-3 w-3" />
                  {formatDuration(video.durationSeconds)}
                </Badge>
              </div>

              <div className="absolute top-4 right-4">
                {video.isPublished ? (
                  <div className="h-8 w-8 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg backdrop-blur-md border border-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-800/90 flex items-center justify-center shadow-lg backdrop-blur-md border border-slate-700">
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <h3 className={cn(displayFont.className, 'text-xl font-bold text-slate-900 line-clamp-1 mb-2')}>{video.title}</h3>
              <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-4 flex-1">
                {video.description || 'Keine Beschreibung vorhanden.'}
              </p>

              <div className="mb-4 text-xs font-semibold text-slate-500">
                Status: {video.muxStatus || (video.muxPlaybackId ? 'ready' : 'processing')}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                <Button
                  variant={video.isPublished ? 'outline' : 'default'}
                  className={cn(
                    'flex-1 h-10 font-bold rounded-xl',
                    video.isPublished ? 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                  onClick={() => togglePublish(video)}
                  disabled={busyVideoId === video.id}
                >
                  {busyVideoId === video.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : video.isPublished ? (
                    'Verbergen'
                  ) : (
                    'Veröffentlichen'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  onClick={() => deleteVideo(video.id)}
                  disabled={busyVideoId === video.id}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && videos.length === 0 && (
        <div className="py-32 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50 mt-8">
          <div className="h-20 w-20 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
            <Clapperboard className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className={cn(displayFont.className, 'text-2xl font-bold text-slate-800')}>Noch keine Videos vorhanden</h3>
          <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2 mb-8">Laden Sie Ihr erstes Video direkt zu Mux hoch und veröffentlichen Sie es in der Akademie.</p>
          <Button onClick={openDialog} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
            Video hochladen
          </Button>
        </div>
      )}
    </div>
  )
}
