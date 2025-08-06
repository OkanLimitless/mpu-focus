import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Find the user with verification token
    const user = await User.findOne({ email: session.user.email })
      .select('verificationStatus verificationToken')
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Only provide resubmission link if user is in resubmission_required status
    if (user.verificationStatus !== 'resubmission_required') {
      return NextResponse.json(
        { error: 'User is not in resubmission status' },
        { status: 400 }
      )
    }

    if (!user.verificationToken) {
      return NextResponse.json(
        { error: 'No verification token found' },
        { status: 400 }
      )
    }

    const resubmissionUrl = `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`

    return NextResponse.json({
      success: true,
      resubmissionUrl
    })

  } catch (error) {
    console.error('Error getting resubmission link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}