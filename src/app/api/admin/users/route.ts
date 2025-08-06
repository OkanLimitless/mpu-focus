import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
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
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all users with their basic info
    const users = await User.find({})
      .select('email firstName lastName role isActive createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .lean()

    // Get all chapters to calculate total
    const totalChapters = await Chapter.countDocuments({ isActive: true })

    // Get progress data for all users
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        if (user.role === 'user') {
          // Get chapter-based progress for this user
          const chapterProgress = await VideoProgress.aggregate([
            { $match: { userId: user._id } },
            {
              $group: {
                _id: '$chapterId',
                totalVideos: { $sum: 1 },
                completedVideos: { 
                  $sum: { 
                    $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] 
                  } 
                },
                lastActivity: { $max: '$lastWatchedAt' }
              }
            },
            {
              $addFields: {
                isChapterCompleted: {
                  $gte: [
                    { $divide: ['$completedVideos', '$totalVideos'] },
                    0.8 // Chapter is considered complete when 80% of videos are done
                  ]
                }
              }
            }
          ])

          const completedChapters = chapterProgress.filter(chapter => chapter.isChapterCompleted).length
          const totalUserChapters = chapterProgress.length
          const overallProgress = totalUserChapters > 0 
            ? Math.round((completedChapters / totalUserChapters) * 100)
            : 0

          // Get last activity across all videos
          const lastActivity = chapterProgress.reduce((latest, chapter) => {
            if (!latest || (chapter.lastActivity && chapter.lastActivity > latest)) {
              return chapter.lastActivity
            }
            return latest
          }, null)

          return {
            ...user,
            progress: {
              totalChapters: totalUserChapters,
              completedChapters,
              totalVideos: chapterProgress.reduce((sum, ch) => sum + ch.totalVideos, 0),
              completedVideos: chapterProgress.reduce((sum, ch) => sum + ch.completedVideos, 0),
              averageProgress: overallProgress,
              lastActivity
            }
          }
        }

        return user
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithProgress
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('email firstName lastName isActive')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}