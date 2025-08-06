import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: Video } = await import('@/models/Video')
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
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

    // Get the active course
    const course = await Course.findOne({ isActive: true })
    if (!course) {
      return NextResponse.json({ 
        progress: {
          totalChapters: 0,
          completedChapters: 0,
          totalVideos: 0,
          completedVideos: 0,
          overallProgress: 0
        }
      })
    }

    // Get total counts
    const [totalVideos, totalChapters] = await Promise.all([
      Video.countDocuments({ isActive: true }),
      Chapter.countDocuments({ isActive: true })
    ])

    // Get or create user course progress
    let userCourseProgress = await UserCourseProgress.findOne({
      userId: user._id,
      courseId: course._id
    })

    if (!userCourseProgress) {
      userCourseProgress = new UserCourseProgress({
        userId: user._id,
        courseId: course._id,
        currentChapterOrder: 1,
        completedChapters: [],
        lastAccessedAt: new Date()
      })
      await userCourseProgress.save()
    }

    // Get user's video progress
    const progressRecords = await VideoProgress.find({ userId: user._id })
      .populate('videoId', 'title chapterId')
      .lean()

    const completedVideos = progressRecords.filter(p => p.isCompleted).length
    
    // Use the chapter completion data from UserCourseProgress
    const completedChapters = userCourseProgress.completedChapters.length

    // Calculate overall progress based on chapter completion (more accurate for course progression)
    const overallProgress = totalChapters > 0 
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0

    console.log('Progress calculation:', {
      userId: user._id,
      totalChapters,
      completedChapters,
      totalVideos,
      completedVideos,
      overallProgress,
      userCourseProgressChapters: userCourseProgress.completedChapters
    }) // Debug log

    const progress = {
      totalChapters,
      completedChapters,
      totalVideos,
      completedVideos,
      overallProgress
    }

    return NextResponse.json({ progress })

  } catch (error: any) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}