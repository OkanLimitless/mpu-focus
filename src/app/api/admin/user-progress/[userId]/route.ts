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
      
      // Chapter is completed when 80% or more of videos are completed
      const chapterCompletionPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0
      const isChapterCompleted = chapterCompletionPercentage >= 80

      const lastActivity = chapterProgress.reduce((latest, p) => {
        if (!latest || (p.lastWatchedAt && p.lastWatchedAt > latest)) {
          return p.lastWatchedAt
        }
        return latest
      }, null)

      return {
        chapterId: chapter._id as any,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalVideos,
        completedVideos,
        progress: Math.round(chapterCompletionPercentage),
        isChapterCompleted,
        lastActivity,
        videos: chapterProgress.map(p => ({
          videoId: p.videoId?._id,
          videoTitle: p.videoId?.title,
          videoOrder: p.videoId?.order,
          progress: Math.round(p.completionPercentage || 0),
          timeWatched: p.watchedDuration,
          totalDuration: p.totalDuration,
          lastWatched: p.lastWatchedAt,
          isCompleted: p.isCompleted
        }))
      }
    })

    // Calculate overall statistics based on chapters
    const totalChapters = chapters.length
    const completedChapters = progressByChapter.filter(c => c.isChapterCompleted).length
    const overallProgress = totalChapters > 0 
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0

    // Video statistics for reference
    const totalVideos = userProgress.length
    const completedVideos = userProgress.filter(p => p.isCompleted).length

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