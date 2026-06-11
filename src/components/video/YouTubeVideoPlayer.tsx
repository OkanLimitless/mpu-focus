'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

type PlayerProgress = {
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
}

interface YouTubeVideoPlayerProps {
  video: {
    id: string
    title: string
    youtubeVideoId?: string | null
    durationSeconds?: number | null
  }
  userProgress?: PlayerProgress | null
  persistProgress?: boolean
  onProgressUpdate?: (progress: PlayerProgress) => void
  onVideoComplete?: () => void
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<any> | null = null

function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API ist nur im Browser verfügbar.'))
  }
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.()
        resolve(window.YT)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    })
  }
  return youtubeApiPromise
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function YouTubeVideoPlayer({
  video,
  userProgress,
  persistProgress = true,
  onProgressUpdate,
  onVideoComplete,
}: YouTubeVideoPlayerProps) {
  const { t } = useI18n()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef(video.durationSeconds || 0)
  const progressStateRef = useRef<PlayerProgress>({
    currentTime: userProgress?.currentTime || 0,
    watchedDuration: userProgress?.watchedDuration || 0,
    completionPercentage: userProgress?.completionPercentage || 0,
    isCompleted: userProgress?.isCompleted || false,
  })
  const resumeTimeRef = useRef(userProgress?.currentTime || 0)
  const [ready, setReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)

  const stopProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  const saveProgress = async (currentTime: number, totalDuration: number) => {
    const safeDuration = Math.max(totalDuration || durationRef.current || 0, 1)
    const previous = progressStateRef.current
    const watchedDuration = Math.max(previous.watchedDuration, currentTime)
    const completionPercentage = clamp(Math.round((watchedDuration / safeDuration) * 100), 0, 100)
    const isCompleted = completionPercentage >= 90 || previous.isCompleted

    const nextProgress: PlayerProgress = {
      currentTime: Math.round(currentTime),
      watchedDuration: Math.round(watchedDuration),
      completionPercentage,
      isCompleted,
    }

    progressStateRef.current = nextProgress
    onProgressUpdate?.(nextProgress)

    if (!persistProgress) return

    try {
      const response = await fetch('/api/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          currentTime: nextProgress.currentTime,
          watchedDuration: nextProgress.watchedDuration,
          totalDuration: Math.round(safeDuration),
          isCompleted: nextProgress.isCompleted,
        }),
      })

      if (!response.ok) {
        throw new Error('Progress konnte nicht gespeichert werden.')
      }

      if (!previous.isCompleted && nextProgress.isCompleted) {
        onVideoComplete?.()
      }
    } catch (error) {
      console.error('Failed to save video progress:', error)
    }
  }

  const startProgressInterval = () => {
    stopProgressInterval()
    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return

      const currentTime = Number(player.getCurrentTime() || 0)
      const totalDuration = Number(player.getDuration?.() || durationRef.current || 0)
      if (totalDuration > 0) durationRef.current = totalDuration

      const previous = progressStateRef.current
      const watchedDuration = Math.max(previous.watchedDuration, currentTime)
      const completionPercentage = totalDuration > 0
        ? clamp(Math.round((watchedDuration / totalDuration) * 100), 0, 100)
        : previous.completionPercentage

      progressStateRef.current = {
        currentTime,
        watchedDuration,
        completionPercentage,
        isCompleted: completionPercentage >= 90 || previous.isCompleted,
      }
    }, 1000)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host || !video.youtubeVideoId) return

    let destroyed = false
    setReady(false)
    setPlayerError(null)

    // The IFrame API replaces the mount node with an iframe, so the mount is
    // created imperatively to keep React's DOM tree intact.
    const mount = document.createElement('div')
    mount.style.width = '100%'
    mount.style.height = '100%'
    host.appendChild(mount)

    loadYouTubeIframeApi()
      .then((YT) => {
        if (destroyed) return
        playerRef.current = new YT.Player(mount, {
          videoId: video.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            start: Math.max(0, Math.floor(resumeTimeRef.current)),
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (destroyed) return
              const total = Number(event.target?.getDuration?.() || 0)
              if (total > 0) durationRef.current = total
              setReady(true)
            },
            onError: () => {
              if (destroyed) return
              setPlayerError('Dieses YouTube-Video kann nicht abgespielt werden. Prüfen Sie, ob es existiert und Einbettung erlaubt ist.')
            },
            onStateChange: (event: any) => {
              if (destroyed) return
              const player = event.target
              if (event.data === window.YT?.PlayerState?.PLAYING) {
                startProgressInterval()
              } else if (event.data === window.YT?.PlayerState?.PAUSED) {
                stopProgressInterval()
                void saveProgress(Number(player.getCurrentTime?.() || 0), Number(player.getDuration?.() || 0))
              } else if (event.data === window.YT?.PlayerState?.ENDED) {
                stopProgressInterval()
                const total = Number(player.getDuration?.() || durationRef.current || 0)
                void saveProgress(total, total)
              }
            },
          },
        })
      })
      .catch(() => {
        if (!destroyed) setPlayerError('YouTube-Player konnte nicht geladen werden.')
      })

    return () => {
      destroyed = true
      stopProgressInterval()
      try {
        playerRef.current?.destroy?.()
      } catch {
        // ignore teardown errors
      }
      playerRef.current = null
      host.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, video.youtubeVideoId])

  if (!video.youtubeVideoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-slate-900/50 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Play className="h-10 w-10" />
          <p className="text-sm font-medium">{t('videoNotAvailable')}</p>
        </div>
      </div>
    )
  }

  if (playerError) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-slate-900/50 px-6 text-center text-slate-300">
        <p className="text-sm font-medium">{playerError}</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 text-white">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Loader2 className="h-5 w-5 animate-spin" />
            Video wird geladen...
          </div>
        </div>
      )}
      <div ref={hostRef} className="h-full w-full" />
    </div>
  )
}
