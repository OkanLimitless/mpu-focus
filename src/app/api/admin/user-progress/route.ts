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
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all regular users
    const users = await User.find({ role: 'user', isActive: true })
      .select('firstName lastName email')
      .lean()

    // Get all videos to calculate total count
    const totalVideos = await Video.countDocuments({ isActive: true })

    // Get progress data for all users
    const userProgressData = await Promise.all(
      users.map(async (user) => {
        // Get user's video progress
        const progressRecords = await VideoProgress.find({ userId: user._id })
          .populate('videoId', 'title duration')
          .sort({ lastWatchedAt: -1 })
          .lean()

        const completedVideos = progressRecords.filter(p => p.isCompleted).length
        const totalProgress = progressRecords.length > 0 
          ? progressRecords.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / progressRecords.length
          : 0

        const lastActivity = progressRecords.length > 0 
          ? progressRecords[0].lastWatchedAt 
          : user.createdAt

        return {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          },
          totalVideos,
          completedVideos,
          overallProgress: Math.round(totalProgress),
          lastActivity,
          recentProgress: progressRecords.slice(0, 5).map(progress => ({
            video: {
              title: progress.videoId?.title || 'Unknown Video',
              duration: progress.videoId?.duration || 0
            },
            completionPercentage: progress.completionPercentage || 0,
            isCompleted: progress.isCompleted,
            lastWatchedAt: progress.lastWatchedAt
          }))
        }
      })
    )

    // Sort by overall progress (descending) and then by last activity
    userProgressData.sort((a, b) => {
      if (a.overallProgress !== b.overallProgress) {
        return b.overallProgress - a.overallProgress
      }
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    })

    return NextResponse.json({ userProgress: userProgressData })

  } catch (error: any) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}