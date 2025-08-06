import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Lead from '@/models/Lead'
import User from '@/models/User'
import { sendVerificationInvitation } from '@/lib/email'
import crypto from 'crypto'

export async function POST(
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

    const leadId = params.id
    const lead = await Lead.findById(leadId)
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (lead.status !== 'converted') {
      return NextResponse.json(
        { error: 'Lead must be converted to user before sending verification email' },
        { status: 400 }
      )
    }

    if (!lead.convertedToUserId) {
      return NextResponse.json(
        { error: 'No associated user account found' },
        { status: 400 }
      )
    }

    // Find the user account
    const user = await User.findById(lead.convertedToUserId)
    if (!user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    // Generate verification token if not exists
    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(32).toString('hex')
      await user.save()
    }

    // Send verification email
    const emailResult = await sendVerificationInvitation({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      verificationToken: user.verificationToken
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email: ' + emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })

  } catch (error) {
    console.error('Error sending verification email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}