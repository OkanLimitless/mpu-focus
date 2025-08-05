'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
// Using custom collapsible logic instead of external component
import { BookOpen, ChevronDown, ChevronRight, Play, CheckCircle, Clock, Lock } from 'lucide-react'
import MuxVideoPlayer from '@/components/video/MuxVideoPlayer'

interface VideoData {
  _id: string
  title: string
  description: string
  duration: number
  order: number
  muxPlaybackId?: string
  status: string
  progress: {
    currentTime: number
    watchedDuration: number
    isCompleted: boolean
    completionPercentage: number
  } | null
}

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
  videos: VideoData[]
}

interface CourseData {
  course: {
    _id: string
    title: string
    description: string
  } | null
  chapters: ChapterData[]
  message?: string
}

export default function CoursePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courseData, setCourseData] = useState<CourseData>({ course: null, chapters: [] })
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role === 'admin') {
      router.push('/admin')
      return
    }

    fetchCourse()
  }, [session, status, router])

  const fetchCourse = async () => {
    try {
      const response = await fetch('/api/course')
      if (response.ok) {
        const data = await response.json()
        setCourseData(data)
        
        // Auto-open first chapter and select first incomplete video
        if (data.chapters.length > 0) {
          setOpenChapters(new Set([data.chapters[0]._id]))
          
          // Find first incomplete video
          for (const chapter of data.chapters) {
            const incompleteVideo = chapter.videos.find(v => !v.progress?.isCompleted)
            if (incompleteVideo) {
              setSelectedVideo(incompleteVideo)
              break
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch course:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleChapter = (chapterId: string) => {
    const newOpenChapters = new Set(openChapters)
    if (newOpenChapters.has(chapterId)) {
      newOpenChapters.delete(chapterId)
    } else {
      newOpenChapters.add(chapterId)
    }
    setOpenChapters(newOpenChapters)
  }

  const handleVideoSelect = (video: VideoData) => {
    setSelectedVideo(video)
  }

  const handleProgressUpdate = async () => {
    // Refresh course data to update progress
    await fetchCourse()
  }

  const getChapterProgress = (chapter: ChapterData) => {
    const completedVideos = chapter.videos.filter(v => v.progress?.isCompleted).length
    const totalVideos = chapter.videos.length
    return totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
  }

  const getOverallProgress = () => {
    const allVideos = courseData.chapters.flatMap(c => c.videos)
    const completedVideos = allVideos.filter(v => v.progress?.isCompleted).length
    return allVideos.length > 0 ? Math.round((completedVideos / allVideos.length) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!courseData.course) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>No Course Available</CardTitle>
              <CardDescription>
                {courseData.message || 'There are no courses available at this time.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Course Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {courseData.course.title}
            </CardTitle>
            <CardDescription>
              {courseData.course.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Content Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {courseData.chapters.map((chapter) => (
                  <div key={chapter._id} className="border rounded-lg">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between p-3 h-auto rounded-none"
                      onClick={() => toggleChapter(chapter._id)}
                    >
                      <div className="flex items-start gap-3">
                        {openChapters.has(chapter._id) ? (
                          <ChevronDown className="h-4 w-4 mt-1 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">{chapter.title}</div>
                          <div className="text-xs text-gray-500">
                            {chapter.videos.length} videos • {getChapterProgress(chapter)}% complete
                          </div>
                        </div>
                      </div>
                    </Button>
                    
                    {openChapters.has(chapter._id) && (
                      <div className="ml-4 space-y-1 pb-2">
                        {chapter.videos.map((video) => (
                          <Button
                            key={video._id}
                            variant={selectedVideo?._id === video._id ? "default" : "ghost"}
                            size="sm"
                            className="w-full justify-start p-2 h-auto"
                            onClick={() => handleVideoSelect(video)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {video.progress?.isCompleted ? (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              ) : video.status === 'ready' ? (
                                <Play className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="text-left flex-1">
                                <div className="text-sm font-medium truncate">{video.title}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                                </div>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Video Player */}
          <div className="lg:col-span-2">
            {selectedVideo ? (
              <MuxVideoPlayer
                video={{
                  _id: selectedVideo._id,
                  title: selectedVideo.title,
                  description: selectedVideo.description,
                  muxPlaybackId: selectedVideo.muxPlaybackId,
                  duration: selectedVideo.duration,
                  chapterId: courseData.chapters.find(c => 
                    c.videos.some(v => v._id === selectedVideo._id)
                  )?._id || '',
                  courseId: courseData.course?._id
                }}
                userProgress={selectedVideo.progress ? {
                  currentTime: selectedVideo.progress.currentTime,
                  watchedDuration: selectedVideo.progress.watchedDuration,
                  isCompleted: selectedVideo.progress.isCompleted,
                  completionPercentage: selectedVideo.progress.completionPercentage
                } : undefined}
                onProgressUpdate={handleProgressUpdate}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a video to start learning</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}