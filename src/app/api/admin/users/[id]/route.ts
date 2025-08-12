import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminRes = await requireAdmin()
    if (!adminRes.ok) {
      return NextResponse.json({ error: adminRes.error }, { status: adminRes.status })
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    
    await connectDB()

    const userId = params.id
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const userToDelete = await User.findById(userId).select('email firstName lastName role')

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userToDelete.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 })
    }

    if (userToDelete.email === adminRes.session!.user!.email) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    await User.findByIdAndDelete(userId)

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
    console.error('Error deleting user:', { error: (error as any)?.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}