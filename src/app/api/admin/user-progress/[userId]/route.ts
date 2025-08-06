import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: UserCourseProgress } = await import('@/models/UserCourseProgress')
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the active course
    const activeCourse = await Course.findOne({ isActive: true })
    if (!activeCourse) {
      return NextResponse.json({
        error: 'No active course found'
      }, { status: 404 })
    }

    // Get all chapters for this course
    const chapters = await Chapter.find({ 
      courseId: activeCourse._id, 
      isActive: true 
    })
      .select('_id title order')
      .sort({ order: 1 })
      .lean()

    // Get user's course progress
    const courseProgress = await UserCourseProgress.findOne({ 
      userId,
      courseId: activeCourse._id 
    }).lean() as {
      completedChapters?: number[]
      currentChapterOrder?: number
      lastAccessedAt?: Date
    } | null

    const completedChapterNumbers = courseProgress?.completedChapters || []

    // Create progress by chapter with completion status
    const progressByChapter = chapters.map(chapter => {
      const isChapterCompleted = completedChapterNumbers.includes(chapter.order)
      
      return {
        chapterId: chapter._id as any,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalVideos: 0, // Could be populated if needed from Video model
        completedVideos: 0, // Could be populated if needed
        progress: isChapterCompleted ? 100 : 0,
        isChapterCompleted,
        lastActivity: courseProgress?.lastAccessedAt,
        videos: [] // Could be populated from VideoProgress if needed
      }
    })

    // Calculate overall statistics based on chapters
    const totalChapters = chapters.length
    const completedChapters = completedChapterNumbers.length
    const overallProgress = totalChapters > 0 
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0

    // Video statistics would need to be calculated from VideoProgress if needed
    const totalVideos = 0
    const completedVideos = 0

    return NextResponse.json({
      success: true,
      progress: progressByChapter,
      summary: {
        totalChapters,
        completedChapters,
        overallProgress,
        totalVideos,
        completedVideos
      }
    })

  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}