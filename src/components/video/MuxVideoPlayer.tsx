'use client'

import { useRef, useEffect, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, Play } from 'lucide-react'

interface MuxVideoPlayerProps {
  video: {
    _id: string
    title: string
    description: string
    muxPlaybackId?: string
    duration: number
    chapterId: string
    courseId?: string
  }
  userProgress?: {
    currentTime: number
    watchedDuration: number
    isCompleted: boolean
    completionPercentage: number
  }
  onProgressUpdate?: (progress: {
    currentTime: number
    watchedDuration: number
    totalDuration: number
  }) => void
  onVideoComplete?: () => void
}

export default function MuxVideoPlayer({ 
  video, 
  userProgress, 
  onProgressUpdate,
  onVideoComplete
}: MuxVideoPlayerProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(userProgress?.currentTime || 0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [watchedDuration, setWatchedDuration] = useState(userProgress?.watchedDuration || 0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [playbackToken, setPlaybackToken] = useState<string | null>(null)
  const tokenRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const fetchToken = async () => {
    if (!video.muxPlaybackId || !video._id) return
    try {
      const res = await fetch(`/api/videos/${video._id}/playback-token`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPlaybackToken(data.token)
      }
    } catch {}
  }

  useEffect(() => {
    fetchToken()
    return () => {
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current)
    }
  }, [video._id, video.muxPlaybackId])

  useEffect(() => {
    // Refresh token every 60s to avoid expiry (server TTL ~120s)
    if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current)
    tokenRefreshRef.current = setInterval(() => {
      fetchToken()
    }, 60000)
    return () => {
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current)
    }
  }, [])

  useEffect(() => {
    if (userProgress?.currentTime && playerRef.current) {
      // Resume from last watched position
      if (playerRef.current.currentTime !== userProgress.currentTime) {
        playerRef.current.currentTime = userProgress.currentTime
      }
    }
  }, [userProgress?.currentTime])

  const saveProgress = async (progressData: {
    currentTime: number
    watchedDuration: number
    totalDuration: number
  }) => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/video-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video._id,
          chapterId: video.chapterId,
          courseId: video.courseId,
          ...progressData,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Check if video was just completed (reached 90% threshold)
        const completionThreshold = progressData.totalDuration * 0.9
        const wasCompleted = userProgress?.isCompleted
        const isNowCompleted = progressData.watchedDuration >= completionThreshold
        
        if (!wasCompleted && isNowCompleted) {
          onVideoComplete?.()
        }
      }
      
      onProgressUpdate?.(progressData)
    } catch (error) {
      console.error('Failed to save video progress:', error)
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    
    // Start tracking watch time
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const current = playerRef.current.currentTime || 0
        const total = playerRef.current.duration || duration
        
        setCurrentTime(current)
        setDuration(total)
        
        // Increment watched duration if actively playing
        setWatchedDuration(prev => {
          const newWatchedDuration = Math.min(prev + 1, total)
          
          // Save progress every 5 seconds
          if (newWatchedDuration % 5 === 0) {
            saveProgress({
              currentTime: current,
              watchedDuration: newWatchedDuration,
              totalDuration: total,
            })
          }
          
          return newWatchedDuration
        })
      }
    }, 1000)
  }

  const handlePause = () => {
    setIsPlaying(false)
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Save progress on pause
    if (playerRef.current) {
      saveProgress({
        currentTime: playerRef.current.currentTime || 0,
        watchedDuration,
        totalDuration: playerRef.current.duration || duration,
      })
    }
  }

  const handleTimeUpdate = () => {
    if (playerRef.current) {
      setCurrentTime(playerRef.current.currentTime || 0)
    }
  }

  const handleLoadedMetadata = () => {
    if (playerRef.current) {
      setDuration(playerRef.current.duration || 0)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Mark as completed
    if (playerRef.current) {
      const totalDuration = playerRef.current.duration || duration
      
      saveProgress({
        currentTime: totalDuration,
        watchedDuration: totalDuration,
        totalDuration,
      })
      
      toast({
        title: 'Video Completed!',
        description: 'Great job! You have completed this video.',
      })
      onVideoComplete?.()
    }
  }

  const handleError = () => {
    // On any player error (e.g., 401/403), try refreshing the token
    fetchToken()
  }

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (tokenRefreshRef.current) {
        clearInterval(tokenRefreshRef.current)
      }
    }
  }, [])

  if (!video.muxPlaybackId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {video.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">Video not available</p>
          </div>
          {video.description && (
            <p className="text-sm text-gray-600 mt-4">{video.description}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = duration > 0 ? Math.round((watchedDuration / duration) * 100) : 0
  const isCompleted = userProgress?.isCompleted || progressPercentage >= 90

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {video.title}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isCompleted && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Completed
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <MuxPlayer
            ref={playerRef}
            playbackId={video.muxPlaybackId}
            tokens={playbackToken ? { playback: playbackToken } : undefined}
            metadata={{
              video_title: video.title,
              video_id: video._id,
            }}
            className="w-full"
            style={{ aspectRatio: '16 / 9', width: '100%', ['--media-object-fit' as any]: 'cover' }}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError as any}
            startTime={userProgress?.currentTime || 0}
          />
        </div>
        
        {video.description && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-gray-600">{video.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}