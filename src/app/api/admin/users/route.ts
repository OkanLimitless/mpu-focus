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

    // Get progress data for all users
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        if (user.role === 'user') {
          // Get user progress summary
          const progressData = await VideoProgress.aggregate([
            { $match: { userId: user._id } },
            {
              $group: {
                _id: '$userId',
                totalVideos: { $sum: 1 },
                completedVideos: { 
                  $sum: { 
                    $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] 
                  } 
                },
                averageProgress: { $avg: '$completionPercentage' },
                lastActivity: { $max: '$lastWatched' }
              }
            }
          ])

          // Get unique videos and chapters for this user
          const uniqueVideos = await VideoProgress.distinct('videoId', { userId: user._id })
          const userChapters = await VideoProgress.aggregate([
            { $match: { userId: user._id } },
            { $lookup: { from: 'videos', localField: 'videoId', foreignField: '_id', as: 'video' } },
            { $unwind: '$video' },
            { $group: { _id: '$video.chapterId', avgProgress: { $avg: '$completionPercentage' } } },
            { $match: { avgProgress: { $gte: 95 } } },
            { $count: 'completed' }
          ])

          const progress = progressData[0] || {
            totalVideos: 0,
            completedVideos: 0,
            averageProgress: 0,
            lastActivity: null
          }

          return {
            ...user,
            progress: {
              ...progress,
              totalVideos: uniqueVideos.length,
              totalChapters: 0, // Will be calculated properly in detailed view
              completedChapters: userChapters[0]?.completed || 0,
              averageProgress: Math.round(progress.averageProgress || 0)
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