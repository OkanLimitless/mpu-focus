import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET() {
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
    const { default: Video } = await import('@/models/Video')
    const { default: Chapter } = await import('@/models/Chapter')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get total counts
    const [totalVideos, totalChapters] = await Promise.all([
      Video.countDocuments({ isActive: true }),
      Chapter.countDocuments({ isActive: true })
    ])

    // Get user's progress
    const progressRecords = await VideoProgress.find({ userId: user._id })
      .populate('videoId', 'title chapterId')
      .lean()

    const completedVideos = progressRecords.filter(p => p.isCompleted).length
    const completedChapterIds = new Set(
      progressRecords
        .filter(p => p.isCompleted)
        .map(p => p.chapterId?.toString())
    )
    const completedChapters = completedChapterIds.size

    // Calculate overall progress
    const overallProgress = totalVideos > 0 
      ? Math.round((completedVideos / totalVideos) * 100)
      : 0

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