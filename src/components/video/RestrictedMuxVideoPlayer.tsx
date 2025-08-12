'use client'

import { useRef, useEffect, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, Play } from 'lucide-react'

interface RestrictedMuxVideoPlayerProps {
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
  onVideoComplete?: () => void
  onProgressUpdate?: () => void
}

export default function RestrictedMuxVideoPlayer({ 
  video, 
  userProgress, 
  onVideoComplete,
  onProgressUpdate 
}: RestrictedMuxVideoPlayerProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(userProgress?.currentTime || 0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (userProgress?.currentTime && playerRef.current && hasStarted) {
      // Resume from last watched position
      playerRef.current.currentTime = userProgress.currentTime
    }
  }, [userProgress?.currentTime, hasStarted])

  const saveProgress = async (currentTime: number, isCompleted: boolean = false) => {
    if (!session?.user) return

    try {
      await fetch('/api/video-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video._id,
          chapterId: video.chapterId,
          courseId: video.courseId,
          currentTime,
          watchedDuration: currentTime, // Simplified - just use current time
          totalDuration: duration,
          isCompleted
        }),
      })
      
      onProgressUpdate?.()
    } catch (error) {
      console.error('Failed to save video progress:', error)
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setHasStarted(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
    
    // Save progress on pause
    if (playerRef.current) {
      const current = playerRef.current.currentTime || 0
      saveProgress(current)
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

  const handleEnded = async () => {
    setIsPlaying(false)
    
    // Mark as completed
    if (playerRef.current) {
      const totalDuration = playerRef.current.duration || duration
      await saveProgress(totalDuration, true)
      
      toast({
        title: 'Video Completed!',
        description: 'Great job! You have completed this video.',
      })
      
      onVideoComplete?.()
    }
  }

  // Prevent seeking by resetting to current position if user tries to seek
  const handleSeeked = () => {
    if (playerRef.current && hasStarted) {
      // Allow seeking only if it's within the watched duration or a small buffer
      const seekTime = playerRef.current.currentTime
      const maxAllowedTime = Math.max(currentTime, userProgress?.watchedDuration || 0) + 5 // 5 second buffer
      
      if (seekTime > maxAllowedTime) {
        playerRef.current.currentTime = currentTime
        toast({
          title: 'Seeking Restricted',
          description: 'You cannot skip ahead in the video. Please watch in sequence.',
          variant: 'destructive',
        })
      }
    }
  }

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

  const progressPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0
  const isCompleted = userProgress?.isCompleted || progressPercentage >= 95

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
            onSeeked={handleSeeked}
            startTime={0} // Always start from beginning to prevent seeking on load
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