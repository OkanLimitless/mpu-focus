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
    const { default: UserCourseProgress } = await import('@/models/UserCourseProgress')
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
    
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

    // Get the active course and total chapters
    const activeCourse = await Course.findOne({ isActive: true })
    const totalChapters = activeCourse ? await Chapter.countDocuments({ 
      courseId: activeCourse._id, 
      isActive: true 
    }) : 0

    // Get progress data for all users
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        if (user.role === 'user') {
          // Get user's course progress
          const courseProgress = await UserCourseProgress.findOne({ 
            userId: user._id,
            courseId: activeCourse?._id 
          }).lean() as {
            completedChapters?: number[]
            currentChapterOrder?: number
            lastAccessedAt?: Date
          } | null

          const completedChapters = courseProgress?.completedChapters?.length || 0
          const overallProgress = totalChapters > 0 
            ? Math.round((completedChapters / totalChapters) * 100)
            : 0

                      return {
              ...user,
              progress: {
                totalChapters,
                completedChapters,
                averageProgress: overallProgress,
                lastActivity: courseProgress?.lastAccessedAt || user.createdAt
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