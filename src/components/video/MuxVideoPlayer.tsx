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
}

export default function MuxVideoPlayer({ 
  video, 
  userProgress, 
  onProgressUpdate 
}: MuxVideoPlayerProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(userProgress?.currentTime || 0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [watchedDuration, setWatchedDuration] = useState(userProgress?.watchedDuration || 0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
      await fetch('/api/video-progress', {
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
    }
  }

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
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
            metadata={{
              video_title: video.title,
              video_id: video._id,
            }}
            style={{ height: '400px', width: '100%' }}
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            startTime={userProgress?.currentTime || 0}
          />
          
          {/* Progress overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between text-white text-sm">
              <span>Progress: {progressPercentage}%</span>
              <span>
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / 
                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
        
        {video.description && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-gray-600">{video.description}</p>
          </div>
        )}
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Watch Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}