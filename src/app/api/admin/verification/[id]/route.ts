import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
    const body = await request.json()
    const { action, rejectionReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Find the user to be reviewed
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.verificationStatus !== 'contract_signed') {
      return NextResponse.json(
        { error: 'User must have completed document upload and contract signing before review' },
        { status: 400 }
      )
    }

    // Update user based on action
    if (action === 'approve') {
      user.verificationStatus = 'verified'
      user.verifiedAt = new Date()
      user.verifiedBy = adminUser._id
      
      // Approve the passport document as well
      if (user.passportDocument) {
        user.passportDocument.status = 'approved'
      }
    } else {
      user.verificationStatus = 'rejected'
      
      // Set rejection reason for passport document
      if (user.passportDocument) {
        user.passportDocument.status = 'rejected'
        user.passportDocument.rejectionReason = rejectionReason
      }
    }

    await user.save()

    // Return updated user (exclude sensitive fields)
    const updatedUser = await User.findById(userId)
      .select('firstName lastName email verificationStatus passportDocument contractSigned verifiedAt createdAt')
      .lean()

    return NextResponse.json({
      success: true,
      message: `User verification ${action}d successfully`,
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}