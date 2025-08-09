'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, ChevronDown, ChevronRight, Play, CheckCircle, Clock, Lock, 
  ArrowRight, ArrowLeft, Home, Award, PlayCircle, Pause, SkipForward,
  ChevronLeft, Menu, X
} from 'lucide-react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        
        // Auto-open current chapter
        if (data.chapters.length > 0) {
          const currentChapter = data.chapters.find((c: ChapterData) => c.isCurrent)
          if (currentChapter) {
            setOpenChapters(new Set([currentChapter._id]))
          }
        }

        // Preserve current video selection by refreshing its reference from the new data
        if (selectedVideo) {
          for (const chapter of data.chapters) {
            const match = chapter.videos.find((v: VideoData) => v._id === selectedVideo._id)
            if (match) {
              setSelectedVideo(match)
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
    if (!video.isAccessible) {
      toast({
        title: 'Content Locked',
        description: 'Complete previous chapters to unlock this content.',
        variant: 'destructive',
      })
      return
    }
    setSelectedVideo(video)
  }

  const getNextVideo = () => {
    if (!selectedVideo) return null
    
    const currentChapter = courseData.chapters.find((c: ChapterData) => 
      c.videos.some((v: VideoData) => v._id === selectedVideo._id)
    )
    
    if (!currentChapter) return null
    
    const currentVideoIndex = currentChapter.videos.findIndex(v => v._id === selectedVideo._id)
    
    // Next video in same chapter
    if (currentVideoIndex < currentChapter.videos.length - 1) {
      return currentChapter.videos[currentVideoIndex + 1]
    }
    
    // First video of next unlocked chapter
    const currentChapterIndex = courseData.chapters.findIndex(c => c._id === currentChapter._id)
    for (let i = currentChapterIndex + 1; i < courseData.chapters.length; i++) {
      const nextChapter = courseData.chapters[i]
      if (nextChapter.isUnlocked && nextChapter.videos.length > 0) {
        return nextChapter.videos[0]
      }
    }
    
    return null
  }

  const getPreviousVideo = () => {
    if (!selectedVideo) return null
    
    const currentChapter = courseData.chapters.find((c: ChapterData) => 
      c.videos.some((v: VideoData) => v._id === selectedVideo._id)
    )
    
    if (!currentChapter) return null
    
    const currentVideoIndex = currentChapter.videos.findIndex(v => v._id === selectedVideo._id)
    
    // Previous video in same chapter
    if (currentVideoIndex > 0) {
      return currentChapter.videos[currentVideoIndex - 1]
    }
    
    // Last video of previous chapter
    const currentChapterIndex = courseData.chapters.findIndex(c => c._id === currentChapter._id)
    for (let i = currentChapterIndex - 1; i >= 0; i--) {
      const prevChapter = courseData.chapters[i]
      if (prevChapter.videos.length > 0) {
        return prevChapter.videos[prevChapter.videos.length - 1]
      }
    }
    
    return null
  }

  const handleProgressUpdate = async () => {
    await fetchCourse()
  }

  const handleVideoComplete = async () => {
    if (!selectedVideo || !courseData.course) return

    const chapter = courseData.chapters.find((c: ChapterData) => 
      c.videos.some((v: VideoData) => v._id === selectedVideo._id)
    )

    if (!chapter) return

    const allVideosCompleted = chapter.videos.every((v: VideoData) => 
      v._id === selectedVideo._id || v.progress?.isCompleted
    )

    console.log('Video completion check:', {
      videoId: selectedVideo._id,
      chapterTitle: chapter.title,
      chapterOrder: chapter.order,
      allVideosCompleted,
      videosInChapter: chapter.videos.map(v => ({
        id: v._id,
        title: v.title,
        isCompleted: v.progress?.isCompleted || v._id === selectedVideo._id
      }))
    }) // Debug log

    if (allVideosCompleted) {
      try {
        const response = await fetch('/api/course/complete-chapter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapterOrder: chapter.order,
            courseId: courseData.course._id
          }),
        })

        if (response.ok) {
          toast({
            title: '🎉 Chapter Completed!',
            description: `You've mastered "${chapter.title}". Next chapter unlocked!`,
          })
        } else {
          console.error('Failed to complete chapter:', response.status, response.statusText)
        }

        await fetchCourse()
      } catch (error) {
        console.error('Error completing chapter:', error)
      }
    }

    await handleProgressUpdate()
  }

  const getOverallProgress = () => {
    const totalChapters = courseData.chapters.length
    const completedChapters = courseData.userProgress.completedChapters.length
    return totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  }

  const getCurrentVideoPosition = () => {
    if (!selectedVideo) return { current: 0, total: 0 }
    
    let current = 0
    let total = 0
    
    for (const chapter of courseData.chapters) {
      for (const video of chapter.videos) {
        total++
        if (video._id === selectedVideo._id) {
          current = total
        }
      }
    }
    
    return { current, total }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient_to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your course...</p>
        </div>
      </div>
    )
  }

  if (!courseData.course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              No Course Available
            </CardTitle>
            <CardDescription>
              {courseData.message || 'There are no courses available at this time.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const nextVideo = getNextVideo()
  const prevVideo = getPreviousVideo()
  const { current, total } = getCurrentVideoPosition()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">{courseData.course.title}</h1>
                  <p className="text-sm text-gray-500">
                    Video {current} of {total}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-600">Progress:</span>
                <div className="w-32">
                  <Progress value={getOverallProgress()} className="h-2" />
                </div>
                <span className="text-sm font-medium text-gray-900">{getOverallProgress()}%</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className={`lg:col-span-1 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Course Content</CardTitle>
                <div className="flex items-center gap-2">
                  <Progress value={getOverallProgress()} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{getOverallProgress()}%</span>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-16rem)]">
                <div className="space-y-2 p-4 pt-0">
                  {courseData.chapters.map((chapter, index) => (
                    <div key={chapter._id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <Button
                        variant="ghost"
                        className="w-full justify-start p-4 h-auto font-normal hover:bg-gray-50"
                        onClick={() => toggleChapter(chapter._id)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          {openChapters.has(chapter._id) ? (
                            <ChevronDown className="h-4 w-4 mt-1 flex-shrink-0 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-400" />
                          )}
                          
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{chapter.title}</span>
                              <div className="flex items-center gap-1">
                                {chapter.isCompleted && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Complete
                                  </Badge>
                                )}
                                {chapter.isCurrent && !chapter.isCompleted && (
                                  <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                                    <PlayCircle className="h-3 w-3 mr-1" />
                                    Current
                                  </Badge>
                                )}
                                {!chapter.isUnlocked && (
                                  <Badge variant="outline" className="text-gray-500">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Locked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {chapter.videos.length} videos
                            </div>
                          </div>
                        </div>
                      </Button>
                      
                      {openChapters.has(chapter._id) && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {chapter.videos.map((video, videoIndex) => (
                            <Button
                              key={video._id}
                              variant="ghost"
                              size="sm"
                              className={`w-full justify-start p-3 h-auto font-normal border-none rounded-none
                                ${selectedVideo?._id === video._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                                ${!video.isAccessible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}
                              `}
                              onClick={() => handleVideoSelect(video)}
                              disabled={!video.isAccessible}
                            >
                              <div className="flex items-center gap-3 w-full pl-7">
                                <div className="flex-shrink-0">
                                  {!video.isAccessible ? (
                                    <Lock className="h-4 w-4 text-gray-400" />
                                  ) : video.progress?.isCompleted ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : selectedVideo?._id === video._id ? (
                                    <PlayCircle className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <Play className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                
                                <div className="text-left flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {video.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedVideo ? (
              <>
                {/* Video Player */}
                <Card className="overflow-hidden shadow-lg">
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
                </Card>

                {/* Navigation Controls */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        onClick={() => prevVideo && handleVideoSelect(prevVideo)}
                        disabled={!prevVideo}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">
                          Video {current} of {total}
                        </div>
                        <Progress value={(current / total) * 100} className="w-32 sm:w-48 h-2" />
                      </div>
                      
                      <Button
                        onClick={() => nextVideo && handleVideoSelect(nextVideo)}
                        disabled={!nextVideo}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Video Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedVideo.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {selectedVideo.description}
                        </CardDescription>
                      </div>
                      
                      {selectedVideo.progress?.isCompleted && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Award className="h-4 w-4 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </>
            ) : (
              <Card className="h-auto">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{courseData.course.title}</h3>
                        {courseData.course.description && (
                          <p className="text-gray-600 mt-2 max-w-2xl">{courseData.course.description}</p>
                        )}
                      </div>
                      <div className="min-w-[240px]">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>Overall Progress</span>
                          <span className="font-medium">{getOverallProgress()}%</span>
                        </div>
                        <Progress value={getOverallProgress()} className="h-2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          // Find first accessible incomplete video on demand (Resume)
                          for (const chapter of courseData.chapters) {
                            if (chapter.isUnlocked) {
                              const incompleteVideo = chapter.videos.find((v: VideoData) => v.isAccessible && !v.progress?.isCompleted)
                              if (incompleteVideo) {
                                setSelectedVideo(incompleteVideo)
                                return
                              }
                            }
                          }
                          // Fallback: first accessible video
                          for (const chapter of courseData.chapters) {
                            const firstAccessible = chapter.videos.find((v: VideoData) => v.isAccessible)
                            if (firstAccessible) {
                              setSelectedVideo(firstAccessible)
                              return
                            }
                          }
                        }}
                      >
                        Resume Course
                      </Button>
                      <span className="text-sm text-gray-500">or select a video from the left to begin</span>
                    </div>
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