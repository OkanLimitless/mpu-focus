import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: Video } = await import('@/models/Video')
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: UserCourseProgress } = await import('@/models/UserCourseProgress')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get the course (for now, get the first/default course)
    const course = await Course.findOne({ isActive: true })
    if (!course) {
      return NextResponse.json({
        course: null,
        chapters: [],
        message: 'No course available'
      })
    }

    // Get all chapters for this course
    const chapters = await Chapter.find({ 
      courseId: course._id, 
      isActive: true 
    }).sort({ order: 1 }).lean()

    // Get all videos for these chapters
    const videos = await Video.find({ 
      chapterId: { $in: chapters.map((c: any) => c._id) }, 
      isActive: true 
    }).sort({ order: 1 }).lean()

    // Get user's video progress
    const progressRecords = await VideoProgress.find({ 
      userId: user._id,
      videoId: { $in: videos.map((v: any) => v._id) }
    }).lean()

    // Create progress lookup
    const progressLookup = progressRecords.reduce((acc, progress) => {
      acc[(progress.videoId as any).toString()] = progress
      return acc
    }, {} as any)

    // Get or create user course progress
    let userProgress = await UserCourseProgress.findOne({
      userId: user._id,
      courseId: course._id
    })

    if (!userProgress) {
      userProgress = new UserCourseProgress({
        userId: user._id,
        courseId: course._id,
        currentChapterOrder: 1,
        completedChapters: [],
        lastAccessedAt: new Date()
      })
      await userProgress.save()
    }

    // Determine unlock status for each chapter - simple approach
    const getChapterUnlockStatus = (chapterOrder: number) => {
      // User can access current chapter and all completed chapters
      return chapterOrder <= userProgress.currentChapterOrder
    }

    // Structure the course data
    const courseData = {
      course: {
        _id: course._id,
        title: course.title,
        description: course.description
      },
      chapters: chapters.map((chapter: any) => {
        const isUnlocked = getChapterUnlockStatus(chapter.order)
        const isCompleted = userProgress.completedChapters.includes(chapter.order)
        const isCurrent = chapter.order === userProgress.currentChapterOrder
        
        return {
          _id: chapter._id,
          title: chapter.title,
          description: chapter.description,
          order: chapter.order,
          isUnlocked,
          isCompleted,
          isCurrent,
          videos: videos
            .filter(video => video.chapterId.toString() === (chapter._id as any).toString())
            .map(video => ({
              _id: video._id,
              title: video.title,
              description: video.description,
              duration: video.duration,
              order: video.order,
              muxPlaybackId: video.muxPlaybackId,
              status: video.status,
              isAccessible: isUnlocked, // Videos are only accessible if chapter is unlocked
              progress: progressLookup[(video._id as any).toString()] || null
            }))
        }
      }),
      userProgress: {
        currentChapterOrder: userProgress.currentChapterOrder,
        completedChapters: userProgress.completedChapters
      }
    }

    return NextResponse.json(courseData)

  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}