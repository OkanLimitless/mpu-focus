import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
    const { default: Course } = await import('@/models/Course')
    const { default: UserRequest } = await import('@/models/UserRequest')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: Lead } = await import('@/models/Lead')
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get statistics
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      pendingRequests,
      completedVideos,
      totalVideoProgress,
      totalLeads,
      newLeads,
      contactedLeads,
      convertedLeads
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Course.countDocuments({ isActive: true }),
      UserRequest.countDocuments({ status: 'pending' }),
      VideoProgress.countDocuments({ isCompleted: true }),
      VideoProgress.find({}).select('completionPercentage'),
      Lead.countDocuments({}),
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({ status: 'contacted' }),
      Lead.countDocuments({ status: 'converted' })
    ])

    // Calculate average progress
    const averageProgress = totalVideoProgress.length > 0 
      ? Math.round(
          totalVideoProgress.reduce((sum, progress) => sum + (progress.completionPercentage || 0), 0) 
          / totalVideoProgress.length
        )
      : 0

    const stats = {
      totalUsers,
      activeUsers,
      totalCourses,
      pendingRequests,
      completedVideos,
      averageProgress,
      // Lead statistics
      totalLeads,
      newLeads,
      contactedLeads,
      convertedLeads
    }

    return NextResponse.json({ stats })

  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}