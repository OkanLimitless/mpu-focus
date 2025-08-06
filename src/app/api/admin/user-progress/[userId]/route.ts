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
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Video } = await import('@/models/Video')
    
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

    // Get all chapters for reference
    const chapters = await Chapter.find({ isActive: true })
      .select('_id title order')
      .sort({ order: 1 })
      .lean()

    // Get detailed progress for the user
    const userProgress = await VideoProgress.find({ userId })
      .populate('videoId', 'title order chapterId')
      .sort({ 'videoId.order': 1 })
      .lean()

    // Group progress by chapter
    const progressByChapter = chapters.map(chapter => {
      const chapterProgress = userProgress.filter(
        progress => progress.videoId?.chapterId?.toString() === (chapter._id as any).toString()
      )

      const totalVideos = chapterProgress.length
      const completedVideos = chapterProgress.filter(p => p.isCompleted).length
      const averageProgress = totalVideos > 0 
        ? Math.round(chapterProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / totalVideos)
        : 0

      const lastActivity = chapterProgress.reduce((latest, p) => {
        if (!latest || (p.lastWatched && p.lastWatched > latest)) {
          return p.lastWatched
        }
        return latest
      }, null)

      return {
        chapterId: chapter._id as any,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalVideos,
        completedVideos,
        progress: averageProgress,
        lastActivity,
        videos: chapterProgress.map(p => ({
          videoId: p.videoId?._id,
          videoTitle: p.videoId?.title,
          videoOrder: p.videoId?.order,
          progress: Math.round(p.completionPercentage || 0),
          timeWatched: p.timeWatched,
          lastWatched: p.lastWatched,
          isCompleted: p.isCompleted
        }))
      }
    })

    // Calculate overall statistics
    const totalVideos = userProgress.length
    const completedVideos = userProgress.filter(p => p.isCompleted).length
    const overallProgress = totalVideos > 0 
      ? Math.round(userProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / totalVideos)
      : 0

    return NextResponse.json({
      success: true,
      progress: progressByChapter,
      summary: {
        totalVideos,
        completedVideos,
        overallProgress,
        totalChapters: chapters.length,
        completedChapters: progressByChapter.filter(c => c.progress >= 95).length
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