import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from '@/lib/email-service'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { status, rejectionReason, allowResubmission = false } = body

    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "verified" or "rejected"' },
        { status: 400 }
      )
    }

    // Find user by ID
    const user = await User.findById(id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.verificationStatus !== 'contract_signed' && user.verificationStatus !== 'resubmission_required') {
      return NextResponse.json(
        { error: 'User must have completed document upload and contract signing before review' },
        { status: 400 }
      )
    }

    // Update user verification status
    if (status === 'verified') {
      user.verificationStatus = 'verified'
      user.verifiedAt = new Date()
      user.verifiedBy = adminUser._id
      
      // Update document status
      if (user.passportDocument) {
        user.passportDocument.status = 'approved'
        user.passportDocument.allowResubmission = false
      }

      await user.save()

      // Send approval email
      try {
        await sendVerificationApprovedEmail({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        })
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError)
        // Continue with the process even if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'User verified successfully and notification email sent',
        user: {
          _id: user._id,
          verificationStatus: user.verificationStatus,
          verifiedAt: user.verifiedAt
        }
      })

    } else if (status === 'rejected') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Set verification status based on whether resubmission is allowed
      user.verificationStatus = allowResubmission ? 'resubmission_required' : 'rejected'
      
      // Update document status and resubmission settings
      if (user.passportDocument) {
        user.passportDocument.status = 'rejected'
        user.passportDocument.rejectionReason = rejectionReason
        user.passportDocument.allowResubmission = allowResubmission
        
        if (allowResubmission) {
          // Increment resubmission count
          user.passportDocument.resubmissionCount = (user.passportDocument.resubmissionCount || 0) + 1
        }
      }

      await user.save()

      // Send rejection email
      try {
        await sendVerificationRejectedEmail(
          {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          },
          rejectionReason,
          allowResubmission
        )
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError)
        // Continue with the process even if email fails
      }

      return NextResponse.json({
        success: true,
        message: `User verification ${allowResubmission ? 'requires resubmission' : 'rejected'} and notification email sent`,
        user: {
          _id: user._id,
          verificationStatus: user.verificationStatus,
          allowResubmission: allowResubmission
        }
      })
    }

  } catch (error) {
    console.error('Error updating verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Find user by ID with relevant fields
    const user = await User.findById(id)
      .select('firstName lastName email verificationStatus passportDocument contractSigned verifiedAt createdAt')
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}