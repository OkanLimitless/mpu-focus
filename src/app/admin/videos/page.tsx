'use client'

import { useEffect, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
    Clapperboard,
    RefreshCw,
    Plus,
    PlayCircle,
    Clock,
    CheckCircle2,
    XCircle,
    MoreVertical,
    Trash2,
    EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    createdAt?: string
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function formatDuration(seconds?: number | null) {
    if (!seconds || seconds <= 0) return 'n/a'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [busyVideoId, setBusyVideoId] = useState<string | null>(null)

    const loadVideos = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/videos', { cache: 'no-store' })
            const payload = await res.json().catch(() => ({}))
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

    const togglePublish = async (video: VideoItem) => {
        setBusyVideoId(video.id)
        try {
            await fetch(`/api/admin/videos/${video.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !video.isPublished }),
            })
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
            await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' })
            await loadVideos()
        } catch (error) {
            console.error(error)
        } finally {
            setBusyVideoId(null)
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                        <Clapperboard className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className={cn(displayFont.className, "text-3xl font-bold text-slate-900 tracking-tight")}>Video Akademie</h1>
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
                        <RefreshCw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
                    </Button>
                    <Button
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-sm rounded-xl"
                        onClick={() => alert('Dieser Bereich wird im nächsten Schritt angebunden.')}
                    >
                        <Plus className="h-5 w-5" />
                        Neues Video
                    </Button>
                </div>
            </header>

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
                                    {video.category}
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
                            <h3 className={cn(displayFont.className, "text-xl font-bold text-slate-900 line-clamp-1 mb-2")}>{video.title}</h3>
                            <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6 flex-1">
                                {video.description || 'Keine Beschreibung vorhanden. Fügen Sie mehr Kontext hinzu, um den Kursinhalt zu verdeutlichen.'}
                            </p>

                            <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-auto">
                                <Button
                                    variant={video.isPublished ? "outline" : "default"}
                                    className={cn(
                                        "flex-1 h-10 font-bold rounded-xl",
                                        video.isPublished ? "border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100" : "bg-emerald-600 text-white hover:bg-emerald-700"
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
                    <h3 className={cn(displayFont.className, "text-2xl font-bold text-slate-800")}>Noch keine Videos vorhanden</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2 mb-8">Beginnen Sie mit dem Aufbau Ihrer Akademie, indem Sie Ihr erstes Video-Modul hochladen.</p>
                    <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
                        Video hochladen
                    </Button>
                </div>
            )}
        </div>
    )
}
