import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import UserProgress from '@/models/UserProgress'
import Chapter from '@/models/Chapter'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Get all chapters for reference
    const chapters = await Chapter.find({ isActive: true })
      .select('_id title order')
      .sort({ order: 1 })
      .lean()

    // Get detailed progress for the user
    const userProgress = await UserProgress.find({ userId })
      .populate('chapterId', 'title order')
      .populate('videoId', 'title order')
      .sort({ 'chapterId.order': 1, 'videoId.order': 1 })
      .lean()

    // Group progress by chapter
    const progressByChapter = chapters.map(chapter => {
      const chapterProgress = userProgress.filter(
        progress => progress.chapterId._id.toString() === chapter._id.toString()
      )

      const totalVideos = chapterProgress.length
      const completedVideos = chapterProgress.filter(p => p.progress >= 95).length
      const averageProgress = totalVideos > 0 
        ? Math.round(chapterProgress.reduce((sum, p) => sum + p.progress, 0) / totalVideos)
        : 0

      const lastActivity = chapterProgress.reduce((latest, p) => {
        if (!latest || (p.lastWatched && p.lastWatched > latest)) {
          return p.lastWatched
        }
        return latest
      }, null)

      return {
        chapterId: chapter._id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalVideos,
        completedVideos,
        progress: averageProgress,
        lastActivity,
        videos: chapterProgress.map(p => ({
          videoId: p.videoId._id,
          videoTitle: p.videoId.title,
          videoOrder: p.videoId.order,
          progress: Math.round(p.progress),
          timeWatched: p.timeWatched,
          lastWatched: p.lastWatched,
          isCompleted: p.progress >= 95
        }))
      }
    })

    // Calculate overall statistics
    const totalVideos = userProgress.length
    const completedVideos = userProgress.filter(p => p.progress >= 95).length
    const overallProgress = totalVideos > 0 
      ? Math.round(userProgress.reduce((sum, p) => sum + p.progress, 0) / totalVideos)
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