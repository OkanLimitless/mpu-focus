'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
// Using custom collapsible logic instead of external component
import { BookOpen, ChevronDown, ChevronRight, Play, CheckCircle, Clock, Lock } from 'lucide-react'
import RestrictedMuxVideoPlayer from '@/components/video/RestrictedMuxVideoPlayer'
import { useToast } from '@/hooks/use-toast'

interface VideoData {
  _id: string
  title: string
  description: string
  duration: number
  order: number
  muxPlaybackId?: string
  status: string
  isAccessible: boolean
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
  isUnlocked: boolean
  isCompleted: boolean
  isCurrent: boolean
  videos: VideoData[]
}

interface CourseData {
  course: {
    _id: string
    title: string
    description: string
  } | null
  chapters: ChapterData[]
  userProgress: {
    currentChapterOrder: number
    completedChapters: number[]
  }
  message?: string
}

export default function CoursePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [courseData, setCourseData] = useState<CourseData>({ 
    course: null, 
    chapters: [], 
    userProgress: { currentChapterOrder: 1, completedChapters: [] }
  })
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
          
          // Find first accessible incomplete video
          for (const chapter of data.chapters) {
            if (chapter.isUnlocked) {
              const incompleteVideo = chapter.videos.find((v: VideoData) => 
                v.isAccessible && !v.progress?.isCompleted
              )
              if (incompleteVideo) {
                setSelectedVideo(incompleteVideo)
                break
              }
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
    if (!video.isAccessible) {
      toast({
        title: 'Chapter Locked',
        description: 'Complete previous chapters to unlock this content.',
        variant: 'destructive',
      })
      return
    }
    setSelectedVideo(video)
  }

  const handleProgressUpdate = async () => {
    // Refresh course data to update progress
    await fetchCourse()
  }

  const handleVideoComplete = async () => {
    if (!selectedVideo || !courseData.course) return

    // Find which chapter this video belongs to
    const chapter = courseData.chapters.find((c: ChapterData) => 
      c.videos.some((v: VideoData) => v._id === selectedVideo._id)
    )

    if (!chapter) return

    // Check if all videos in this chapter are completed
    const allVideosCompleted = chapter.videos.every((v: VideoData) => 
      v._id === selectedVideo._id || v.progress?.isCompleted
    )

    if (allVideosCompleted) {
      try {
        await fetch('/api/course/complete-chapter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapterOrder: chapter.order,
            courseId: courseData.course._id
          }),
        })

        toast({
          title: 'Chapter Completed!',
          description: `You've completed "${chapter.title}". Next chapter unlocked!`,
        })

        // Refresh course data to show newly unlocked content
        await fetchCourse()
      } catch (error) {
        console.error('Error completing chapter:', error)
      }
    }

    // Refresh progress anyway
    await handleProgressUpdate()
  }

  const getOverallProgress = () => {
    const totalChapters = courseData.chapters.length
    const completedChapters = courseData.userProgress.completedChapters.length
    return totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
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
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{chapter.title}</span>
                              {chapter.isCompleted && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {!chapter.isUnlocked && (
                                <Lock className="h-4 w-4 text-gray-400" />
                              )}
                              {chapter.isCurrent && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {chapter.videos.length} videos
                              {!chapter.isUnlocked && ' • Locked'}
                              {chapter.isCompleted && ' • Completed'}
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
                             className={`w-full justify-start p-2 h-auto ${!video.isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`}
                             onClick={() => handleVideoSelect(video)}
                             disabled={!video.isAccessible}
                           >
                             <div className="flex items-center gap-2 w-full">
                               {!video.isAccessible ? (
                                 <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                               ) : video.progress?.isCompleted ? (
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
                                   {!video.isAccessible && ' • Locked'}
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
              <RestrictedMuxVideoPlayer
                video={{
                  _id: selectedVideo._id,
                  title: selectedVideo.title,
                  description: selectedVideo.description,
                  muxPlaybackId: selectedVideo.muxPlaybackId,
                  duration: selectedVideo.duration,
                  chapterId: courseData.chapters.find((c: ChapterData) => 
                    c.videos.some((v: VideoData) => v._id === selectedVideo._id)
                  )?._id || '',
                  courseId: courseData.course?._id
                }}
                userProgress={selectedVideo.progress ? {
                  currentTime: selectedVideo.progress.currentTime,
                  watchedDuration: selectedVideo.progress.watchedDuration,
                  isCompleted: selectedVideo.progress.isCompleted,
                  completionPercentage: selectedVideo.progress.completionPercentage
                } : undefined}
                onVideoComplete={handleVideoComplete}
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