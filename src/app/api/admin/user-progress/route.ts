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

    // Get all regular users
    const users = await User.find({ role: 'user', isActive: true })
      .select('firstName lastName email createdAt')
      .lean()

    // Get total chapters count (assuming one active course for simplicity)
    const activeCourse = await Course.findOne({ isActive: true })
    const totalChapters = activeCourse ? await Chapter.countDocuments({ 
      courseId: activeCourse._id, 
      isActive: true 
    }) : 0

    // Get progress data for all users
    const userProgressData = await Promise.all(
      users.map(async (user) => {
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
        const currentChapter = courseProgress?.currentChapterOrder || 1
        const lastActivity = courseProgress?.lastAccessedAt || user.createdAt
        const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0

        return {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          },
          totalChapters,
          completedChapters,
          currentChapter,
          overallProgress,
          lastActivity
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