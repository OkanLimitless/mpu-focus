import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import User from '@/models/User'
import UserProgress from '@/models/UserProgress'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

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
          const progressData = await UserProgress.aggregate([
            { $match: { userId: user._id } },
            {
              $group: {
                _id: '$userId',
                totalVideos: { $sum: 1 },
                completedVideos: { 
                  $sum: { 
                    $cond: [{ $gte: ['$progress', 95] }, 1, 0] 
                  } 
                },
                averageProgress: { $avg: '$progress' },
                lastActivity: { $max: '$lastWatched' }
              }
            }
          ])

          // Get total chapters for this user
          const chapterCount = await UserProgress.distinct('chapterId', { userId: user._id })
          const completedChapters = await UserProgress.aggregate([
            { $match: { userId: user._id } },
            { $group: { _id: '$chapterId', avgProgress: { $avg: '$progress' } } },
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
              totalChapters: chapterCount.length,
              completedChapters: completedChapters[0]?.completed || 0,
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
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    await connectToDatabase()

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