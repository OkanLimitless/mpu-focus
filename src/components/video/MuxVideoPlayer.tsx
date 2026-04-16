'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { Loader2, Play } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

type PlayerProgress = {
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
}

type PlaybackPayload = {
  playbackId: string
  tokens: {
    playback: string
    thumbnail: string
    storyboard: string
  }
}

interface MuxVideoPlayerProps {
  video: {
    id: string
    title: string
    muxPlaybackId?: string | null
    durationSeconds?: number | null
  }
  userProgress?: PlayerProgress | null
  persistProgress?: boolean
  onProgressUpdate?: (progress: PlayerProgress) => void
  onVideoComplete?: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function MuxVideoPlayer({
  video,
  userProgress,
  persistProgress = true,
  onProgressUpdate,
  onVideoComplete,
}: MuxVideoPlayerProps) {
  const { t } = useI18n()
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressStateRef = useRef<PlayerProgress>({
    currentTime: userProgress?.currentTime || 0,
    watchedDuration: userProgress?.watchedDuration || 0,
    completionPercentage: userProgress?.completionPercentage || 0,
    isCompleted: userProgress?.isCompleted || false,
  })
  const [playback, setPlayback] = useState<PlaybackPayload | null>(null)
  const [loadingPlayback, setLoadingPlayback] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [duration, setDuration] = useState(video.durationSeconds || 0)
  const [progressState, setProgressState] = useState<PlayerProgress>({
    currentTime: userProgress?.currentTime || 0,
    watchedDuration: userProgress?.watchedDuration || 0,
    completionPercentage: userProgress?.completionPercentage || 0,
    isCompleted: userProgress?.isCompleted || false,
  })

  useEffect(() => {
    const nextProgress = {
      currentTime: userProgress?.currentTime || 0,
      watchedDuration: userProgress?.watchedDuration || 0,
      completionPercentage: userProgress?.completionPercentage || 0,
      isCompleted: userProgress?.isCompleted || false,
    }
    setDuration(video.durationSeconds || 0)
    progressStateRef.current = nextProgress
    setProgressState(nextProgress)
  }, [video.id, video.durationSeconds, userProgress])

  useEffect(() => {
    if (!video.muxPlaybackId) {
      setPlayback(null)
      return
    }

    let ignore = false
    setLoadingPlayback(true)
    setPlaybackError(null)

    ;(async () => {
      try {
        const response = await fetch(`/api/videos/${video.id}/playback`, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Playback konnte nicht geladen werden.')
        }
        if (!ignore) {
          setPlayback(payload)
        }
      } catch (error: any) {
        if (!ignore) {
          setPlayback(null)
          setPlaybackError(error?.message || 'Playback konnte nicht geladen werden.')
        }
      } finally {
        if (!ignore) {
          setLoadingPlayback(false)
        }
      }
    })()

    return () => {
      ignore = true
    }
  }, [video.id, video.muxPlaybackId])

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const saveProgress = async (currentTime: number, totalDuration: number) => {
    if (!persistProgress) return

    const safeDuration = Math.max(totalDuration || duration || 0, 1)
    const previous = progressStateRef.current
    const watchedDuration = Math.max(previous.watchedDuration, currentTime)
    const completionPercentage = clamp(Math.round((watchedDuration / safeDuration) * 100), 0, 100)
    const isCompleted = completionPercentage >= 90

    const nextProgress: PlayerProgress = {
      currentTime: Math.round(currentTime),
      watchedDuration: Math.round(watchedDuration),
      completionPercentage,
      isCompleted,
    }

    progressStateRef.current = nextProgress
    setProgressState(nextProgress)
    onProgressUpdate?.(nextProgress)

    try {
      const response = await fetch('/api/video-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handlePlay = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player) return

      const currentTime = Number(player.currentTime || 0)
      const totalDuration = Number(player.duration || duration || 0)

      setProgressState((prev) => {
        const watchedDuration = Math.max(prev.watchedDuration, currentTime)
        const completionPercentage = totalDuration > 0
          ? clamp(Math.round((watchedDuration / totalDuration) * 100), 0, 100)
          : prev.completionPercentage

        const nextProgress = {
          currentTime,
          watchedDuration,
          completionPercentage,
          isCompleted: completionPercentage >= 90 || prev.isCompleted,
        }
        progressStateRef.current = nextProgress
        return nextProgress
      })
    }, 1000)
  }

  const handlePause = async () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    const player = playerRef.current
    if (!player) return
    await saveProgress(Number(player.currentTime || 0), Number(player.duration || duration || 0))
  }

  const handleLoadedMetadata = () => {
    const player = playerRef.current
    if (!player) return

    const totalDuration = Number(player.duration || 0)
    setDuration(totalDuration)

    const resumeTime = userProgress?.currentTime || 0
    if (resumeTime > 0 && Math.abs(Number(player.currentTime || 0) - resumeTime) > 1) {
      player.currentTime = resumeTime
    }
  }

  const handleEnded = async () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    const totalDuration = Number(playerRef.current?.duration || duration || 0)
    await saveProgress(totalDuration, totalDuration)
  }

  const playerTokens = useMemo(() => playback?.tokens, [playback])

  if (!video.muxPlaybackId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-slate-900/50 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Play className="h-10 w-10" />
          <p className="text-sm font-medium">{t('videoNotAvailable')}</p>
        </div>
      </div>
    )
  }

  if (loadingPlayback) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-slate-900/50 text-white">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Playback wird vorbereitet...
        </div>
      </div>
    )
  }

  if (!playback || !playerTokens) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-slate-900/50 px-6 text-center text-slate-300">
        <p className="text-sm font-medium">{playbackError || t('videoNotAvailable')}</p>
      </div>
    )
  }

  return (
    <MuxPlayer
      ref={playerRef}
      playbackId={playback.playbackId}
      tokens={playerTokens}
      metadata={{
        video_title: video.title,
        video_id: video.id,
      }}
      className="h-full w-full"
      style={{ aspectRatio: '16 / 9', width: '100%', ['--media-object-fit' as any]: 'cover' }}
      onPlay={handlePlay}
      onPause={handlePause}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      startTime={userProgress?.currentTime || 0}
    />
  )
}
