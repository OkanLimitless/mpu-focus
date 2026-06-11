'use client'

import MuxVideoPlayer from '@/components/video/MuxVideoPlayer'
import YouTubeVideoPlayer from '@/components/video/YouTubeVideoPlayer'

type PlayerProgress = {
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
}

interface VideoPlayerProps {
  video: {
    id: string
    title: string
    provider?: string | null
    youtubeVideoId?: string | null
    muxPlaybackId?: string | null
    durationSeconds?: number | null
  }
  userProgress?: PlayerProgress | null
  persistProgress?: boolean
  onProgressUpdate?: (progress: PlayerProgress) => void
  onVideoComplete?: () => void
}

export default function VideoPlayer({ video, ...rest }: VideoPlayerProps) {
  if (video.provider === 'youtube' || video.youtubeVideoId) {
    return <YouTubeVideoPlayer video={video} {...rest} />
  }
  return <MuxVideoPlayer video={video} {...rest} />
}
