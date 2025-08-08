import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB()

    const token = params.token
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const user = await User.findOne({ verificationToken: token })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token', valid: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        verificationStatus: user.verificationStatus,
        passportDocument: user.passportDocument,
        contractSigned: user.contractSigned?.signedAt ? user.contractSigned : undefined,
        verifiedAt: user.verifiedAt
      }
    })

  } catch (error) {
    console.error('Error verifying token:', error)
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    )
  }
}