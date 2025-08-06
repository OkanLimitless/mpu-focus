import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const userId = params.id

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find the user first to get their info for the response
    const userToDelete = await User.findById(userId).select('email firstName lastName role')

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of admin users for safety
    if (userToDelete.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (userToDelete.email === session.user.email) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      )
    }

    // Delete the user
    await User.findByIdAndDelete(userId)

    // Clean up related course progress data
    const { default: UserCourseProgress } = await import('@/models/UserCourseProgress')
    await UserCourseProgress.deleteMany({ userId })

    return NextResponse.json({
      success: true,
      message: `User ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email}) has been permanently deleted`,
      deletedUser: {
        id: userId,
        email: userToDelete.email,
        firstName: userToDelete.firstName,
        lastName: userToDelete.lastName
      }
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}