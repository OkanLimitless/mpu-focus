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

    // Find the user with verification details
    const user = await User.findOne({ email: session.user.email })
      .select('-password -verificationToken') // Exclude sensitive fields
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        verificationStatus: user.verificationStatus,
        passportDocument: user.passportDocument,
        contractSigned: user.contractSigned,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}